// Drives the real Vault service and shared workspace preference service against temporary files.
// A released writer replaces only its legacy record between restarts. No account or provider runs.
// The cipher is injected, as in agent-api-keys-e2e.ts; native keychain access is not tested here.
// Run: bun scripts/persisted-state-downgrade-e2e.ts
// Writes .openbot-build/persisted-state-downgrade-e2e/report.json.
import assert from "node:assert/strict";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createWorkspacePreferences } from "@openbot/team-client/workspace-preferences";
import { Effect } from "effect";
import { VaultService } from "../src/main/vault-service";
import { type VaultRecord, VaultStore } from "../src/main/vault-store";

const output = resolve(import.meta.dirname, "../.openbot-build/persisted-state-downgrade-e2e");
const root = await mkdtemp(join(tmpdir(), "openbot-downgrade-e2e-"));
const path = join(root, "openbot-vault-v1.json");
const keyPath = `${path}.api-keys-v1.json`;
const cipher = {
  encrypt: (value: string) => Buffer.from(value, "utf8").reverse(),
  decrypt: (value: Buffer) => Buffer.from(value).reverse().toString("utf8"),
};
const steps: string[] = [];
let passed = false;

async function openVault() {
  const vault = new VaultService({ store: new VaultStore(path, cipher), canPersist: () => true });
  await Effect.runPromise(vault.load());
  return vault;
}

async function writeVaultRecord(record: object) {
  await writeFile(
    path,
    JSON.stringify({ version: 1, record: cipher.encrypt(JSON.stringify(record)).toString("base64") }),
  );
}

async function legacyVaultWrite() {
  const envelope: { record: string } = JSON.parse(await readFile(path, "utf8"));
  const { logins, cards, contacts }: VaultRecord = JSON.parse(cipher.decrypt(Buffer.from(envelope.record, "base64")));
  // These are exactly the collections that the released writer keeps. Its edit must survive too.
  await writeVaultRecord({
    logins: logins.map((login) => ({ ...login, notes: "edited by the released build" })),
    cards,
    contacts,
  });
}

try {
  let vault = await openVault();
  await Effect.runPromise(
    vault.save({
      kind: "login",
      id: null,
      website: "example.com",
      username: "owner",
      password: "downgrade-login-secret",
      notes: "",
    }),
  );
  const legacyBefore = await readFile(path, "utf8");
  vault = await openVault();
  assert.equal(await readFile(path, "utf8"), legacyBefore);
  assert.equal(existsSync(keyPath), false, "A legacy-only load must not create an API-key file.");
  steps.push("An encrypted legacy-only load changes no file and creates no separate file");
  await Effect.runPromise(
    vault.save({ kind: "apiKey", id: null, name: "SERVICE_TOKEN", key: "downgrade-api-secret", notes: "" }),
  );
  assert.equal(await readFile(path, "utf8"), legacyBefore, "An API-key save must not change the released file.");
  assert.ok(!(await readFile(keyPath, "utf8")).includes("downgrade-api-secret"));
  await legacyVaultWrite();
  vault = await openVault();
  assert.deepEqual(vault.items.apiKeys(), [{ name: "SERVICE_TOKEN", value: "downgrade-api-secret" }]);
  assert.equal(vault.state().items.find((item) => item.kind === "login")?.notes, "edited by the released build");
  steps.push("API keys survive a released vault write; the released edit survives the upgrade");

  // A profile from the first upstream format has API keys inside the encrypted legacy record.
  await rm(keyPath);
  const firstRecord = {
    logins: [],
    cards: [],
    contacts: [],
    apiKeys: [{ id: "first-key", name: "FIRST_TOKEN", key: "first-format-secret", notes: "" }],
  };
  await writeVaultRecord(firstRecord);
  const firstBytes = await readFile(path, "utf8");
  vault = await openVault();
  assert.equal(vault.state().status, "ready");
  assert.equal(await readFile(path, "utf8"), firstBytes, "The copy must keep the source file.");
  await legacyVaultWrite();
  vault = await openVault();
  assert.equal(vault.items.apiKeys()[0]?.name, "FIRST_TOKEN");
  await Effect.runPromise(vault.delete("first-key"));
  await writeVaultRecord(firstRecord);
  vault = await openVault();
  assert.deepEqual(vault.items.apiKeys(), [], "An empty separate record must prevent old keys from returning.");
  steps.push("The first API-key format is copied without source deletion; deleted keys do not return");

  // Even a first-format record with a repeated id must change only one collection family.
  await rm(keyPath);
  await writeVaultRecord({
    ...firstRecord,
    logins: [{ id: "first-key", website: "example.com", username: "owner", password: "login-secret", notes: "" }],
  });
  vault = await openVault();
  const keysBeforeDelete = await readFile(keyPath, "utf8");
  await Effect.runPromise(vault.delete("first-key"));
  assert.equal(await readFile(keyPath, "utf8"), keysBeforeDelete);
  assert.equal(
    vault.state().items.some((item) => item.kind === "login"),
    false,
  );
  assert.equal(vault.items.apiKeys()[0]?.name, "FIRST_TOKEN");
  const legacyBeforeKeyDelete = await readFile(path, "utf8");
  await Effect.runPromise(vault.delete("first-key"));
  assert.equal(await readFile(path, "utf8"), legacyBeforeKeyDelete);
  steps.push("Legacy and API-key deletes change only their own file, including repeated imported ids");

  await rm(keyPath);
  await mkdir(keyPath);
  await assert.rejects(
    Effect.runPromise(vault.save({ kind: "apiKey", id: null, name: "NEW_TOKEN", key: "new-secret", notes: "" })),
  );
  assert.deepEqual(vault.items.apiKeys(), []);
  assert.equal(await readFile(path, "utf8"), legacyBeforeKeyDelete);
  await rm(keyPath, { recursive: true });
  steps.push("A failed atomic API-key write leaves the in-memory record and legacy file unchanged");

  await writeFile(keyPath, "unreadable key file");
  vault = await openVault();
  assert.equal(vault.state().status, "unreadable");
  await assert.rejects(
    Effect.runPromise(vault.save({ kind: "apiKey", id: null, name: "NEW_TOKEN", key: "new-secret", notes: "" })),
  );
  assert.equal(await readFile(keyPath, "utf8"), "unreadable key file");
  steps.push("An unreadable API-key file blocks saves and is kept unchanged");
  const invalidEnvelope = JSON.stringify({ version: 1, record: cipher.encrypt("null").toString("base64") });
  await writeFile(keyPath, invalidEnvelope);
  vault = await openVault();
  assert.equal(vault.state().status, "unreadable");
  assert.equal(await readFile(keyPath, "utf8"), invalidEnvelope);
  const futureEnvelope = JSON.stringify({ version: 2, record: "future" });
  await writeFile(keyPath, futureEnvelope);
  vault = await openVault();
  assert.equal(vault.state().status, "unreadable");
  assert.equal(await readFile(keyPath, "utf8"), futureEnvelope);
  steps.push("Invalid decrypted records and future API-key envelopes fail closed without writes");
  await Effect.runPromise(vault.reset());
  vault = await openVault();
  assert.equal(vault.state().status, "ready");
  assert.deepEqual(vault.state().items, []);
  steps.push("An explicit reset clears both vault collections");
  await Effect.runPromise(
    vault.save({ kind: "apiKey", id: null, name: "ONLY_TOKEN", key: "only-api-secret", notes: "" }),
  );
  vault = await openVault();
  assert.equal(existsSync(path), false);
  assert.deepEqual(vault.items.apiKeys(), [{ name: "ONLY_TOKEN", value: "only-api-secret" }]);
  steps.push("An API-key-only vault survives restart without creating a legacy file");

  const keys = new Set<string>();
  const storage = {
    get: (key: string) => {
      const file = join(root, encodeURIComponent(key));
      return existsSync(file) ? readFileSync(file, "utf8") : null;
    },
    set: (key: string, value: string) => {
      keys.add(key);
      const file = join(root, encodeURIComponent(key));
      writeFileSync(`${file}.tmp`, value);
      renameSync(`${file}.tmp`, file);
    },
  };
  const preferences = () => createWorkspacePreferences("https://account.example", "owner", storage);
  preferences().write("host", {
    hidden: ["hidden-agent"],
    pinned: ["agent"],
    pinnedChannels: ["channel"],
    pinnedWorkflows: ["flow"],
  });
  const legacyKey = [...keys].find((key) => key.startsWith("openbot.workspace.v1."));
  const workflowKey = [...keys].find((key) => key.startsWith("openbot.workflow-pins.v1."));
  assert.ok(legacyKey && workflowKey);
  const legacy: {
    version: number;
    hidden: string[];
    pinned: string[];
    pinnedChannels: string[];
    pinnedWorkflows?: string[];
  } = JSON.parse(storage.get(legacyKey) ?? "null");
  assert.equal(legacy.pinnedWorkflows, undefined);
  storage.set(legacyKey, JSON.stringify({ ...legacy, pinned: ["released-agent"] }));
  assert.deepEqual(preferences().read("host"), {
    hidden: ["hidden-agent"],
    pinned: ["released-agent"],
    pinnedChannels: ["channel"],
    pinnedWorkflows: ["flow"],
  });
  steps.push("Workflow pins survive a released preference write; agent and channel preferences stay readable");

  await rm(join(root, encodeURIComponent(workflowKey)));
  storage.set(legacyKey, JSON.stringify({ ...legacy, pinnedWorkflows: ["first-flow"] }));
  assert.deepEqual(preferences().read("host").pinnedWorkflows, ["first-flow"]);
  storage.set(legacyKey, JSON.stringify(legacy));
  assert.deepEqual(preferences().read("host").pinnedWorkflows, ["first-flow"]);
  preferences().write("host", { ...legacy, pinnedWorkflows: [] });
  storage.set(legacyKey, JSON.stringify({ ...legacy, pinnedWorkflows: ["first-flow"] }));
  assert.deepEqual(preferences().read("host").pinnedWorkflows, []);
  storage.set(workflowKey, JSON.stringify({ version: 2, pinned: ["future-flow"] }));
  const futureBytes = storage.get(workflowKey);
  assert.throws(() => preferences().read("host"));
  assert.equal(storage.get(workflowKey), futureBytes);
  steps.push("First-format workflow pins are copied; empty records prevent resurrection; future versions are kept");
  passed = true;
} finally {
  await mkdir(output, { recursive: true });
  await writeFile(join(output, "report.json"), `${JSON.stringify({ passed, steps }, null, 2)}\n`);
  await rm(root, { recursive: true, force: true });
}
