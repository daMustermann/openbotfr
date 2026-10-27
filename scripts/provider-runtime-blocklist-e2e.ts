// Check the provider update blocklist with a local fetch stub and no external network requests.
// Run: bun scripts/provider-runtime-blocklist-e2e.ts
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { Effect, Exit } from "effect";
import { fetchBlockedVersions } from "../src/main/provider-runtime-releases";

const OUT = resolve(import.meta.dirname, "../.openbot-build/provider-runtime-blocklist-e2e");
const previousUrl = process.env.OPENBOTFR_RUNTIME_BLOCKLIST_URL;
const requests: string[] = [];
const remoteUrl = "https://example.org/provider-runtime-blocklist.json";
const fetchRemote = async (input: string | URL | Request): Promise<Response> => {
  requests.push(String(input));
  return new Response(JSON.stringify({ schemaVersion: 1, blocked: { codex: ["1.2.3"] } }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};
const report: { passed: boolean; checks: string[]; error?: string } = { passed: false, checks: [] };

try {
  delete process.env.OPENBOTFR_RUNTIME_BLOCKLIST_URL;
  const bundled = await Effect.runPromise(fetchBlockedVersions(fetchRemote));
  assert.equal(bundled.get("codex")?.size, 0);
  assert.deepEqual(requests, [], "The bundled list must not make a request.");
  report.checks.push("Bundled list needs no network request");

  process.env.OPENBOTFR_RUNTIME_BLOCKLIST_URL = remoteUrl;
  const remote = await Effect.runPromise(fetchBlockedVersions(fetchRemote));
  assert.deepEqual(requests, [remoteUrl]);
  assert.equal(remote.get("codex")?.has("1.2.3"), true);
  report.checks.push("Configured HTTPS list is read and applied");

  process.env.OPENBOTFR_RUNTIME_BLOCKLIST_URL = "http://example.org/provider-runtime-blocklist.json";
  const insecure = await Effect.runPromise(Effect.exit(fetchBlockedVersions(fetchRemote)));
  assert.equal(Exit.isFailure(insecure), true);
  assert.deepEqual(requests, [remoteUrl], "An insecure URL must not make a request.");
  report.checks.push("Insecure URL is rejected without a request");

  process.env.OPENBOTFR_RUNTIME_BLOCKLIST_URL = "https://user:secret@example.org/blocked.json";
  const withCredentials = await Effect.runPromise(Effect.exit(fetchBlockedVersions(fetchRemote)));
  assert.equal(Exit.isFailure(withCredentials), true);
  assert.deepEqual(requests, [remoteUrl], "An authenticated URL must not make a request.");
  report.checks.push("URL credentials are rejected without a request");
  report.passed = true;
} catch (error) {
  report.error = error instanceof Error ? error.message : "Unknown failure";
  process.exitCode = 1;
} finally {
  if (previousUrl === undefined) delete process.env.OPENBOTFR_RUNTIME_BLOCKLIST_URL;
  else process.env.OPENBOTFR_RUNTIME_BLOCKLIST_URL = previousUrl;
  await mkdir(OUT, { recursive: true });
  await writeFile(join(OUT, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
}

for (const check of report.checks) process.stdout.write(`PASS ${check}\n`);
if (report.error) process.stderr.write(`FAIL ${report.error}\n`);
process.stdout.write(`Report: ${join(OUT, "report.json")}\n`);
