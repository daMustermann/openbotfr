// Runs the real account invitation flow against a migrated D1 database, with a local mail adapter.
// Run: bun apps/auth-api/scripts/self-host-invite-email-e2e.ts
// Writes .openbot-build/self-host-invite-email-e2e/report.json. No mail or network request is sent.

import { Database } from "bun:sqlite";
import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createInviteUrl, parseInviteUrl } from "@openbot/contracts/invite-links";
import { Effect } from "effect";
import { RemoteControlPlane } from "../src/server/remote-control-plane";
import { sendTeamInviteEmail, type TeamInviteEmailServices } from "../src/server/team-invite-email";
import type { AuthUser, TeamInviteEmailDelivery } from "../src/server/types";

const ROOT = resolve(import.meta.dirname, "../../..");
const OUT = join(ROOT, ".openbot-build", "self-host-invite-email-e2e");
const MIGRATIONS = join(ROOT, "apps", "auth-api", "migrations");
const HOST_ID = randomUUID();
const SELF_HOST = "https://account.example.test";
const OTHER_HOST = "https://other.example.test";
const OWNER: AuthUser = { id: "user-owner", email: "owner@example.test", name: "Owner", avatarUrl: null };
const MEMBER: AuthUser = { id: "user-member", email: "member@example.test", name: "Member", avatarUrl: null };
const RECIPIENT = MEMBER.email;
const checks: { name: string; passed: boolean; code?: string | null }[] = [];

function check(name: string, passed: boolean, code?: string | null) {
  checks.push({ name, passed, ...(code === undefined ? {} : { code }) });
}

/** The small D1 interface over Bun SQLite. The test makes no network calls. */
function sqliteD1(database: Database): D1Database {
  const statement = (sql: string, values: (string | number | null)[] = []): D1PreparedStatement => ({
    bind: (...args: unknown[]) =>
      statement(
        sql,
        args.map((value) => {
          if (value === null || typeof value === "string" || typeof value === "number") return value;
          throw new Error("Invalid D1 binding");
        }),
      ),
    async first<T>(): Promise<T | null> {
      const row = database.query(sql).get(...values);
      return row === null ? null : JSON.parse(JSON.stringify(row));
    },
    async all<T>(): Promise<D1Result<T>> {
      const results = JSON.parse(JSON.stringify(database.query(sql).all(...values)));
      return d1Result(results, 0);
    },
    async run<T>(): Promise<D1Result<T>> {
      const result = database.query(sql).run(...values);
      return d1Result<T>([], result.changes);
    },
    raw: () => {
      throw new Error("Unused D1 raw");
    },
  });
  const unused = () => {
    throw new Error("Unused D1 operation");
  };
  return {
    prepare: (sql) => statement(sql),
    batch: unused,
    exec: unused,
    withSession: unused,
    dump: unused,
  };
}

function d1Result<T>(results: T[], changes: number): D1Result<T> {
  return {
    success: true,
    results,
    meta: {
      changes,
      duration: 0,
      last_row_id: 0,
      changed_db: changes > 0,
      size_after: 0,
      rows_read: 0,
      rows_written: changes,
    },
  };
}

const database = new Database(":memory:");
try {
  database.exec("PRAGMA foreign_keys = ON");
  for (const name of (await readdir(MIGRATIONS)).sort()) database.exec(await readFile(join(MIGRATIONS, name), "utf8"));
  const now = Date.now();
  const insertUser = database.prepare(
    "INSERT INTO users(id, identity_key, email, name, avatar_url, created_at, updated_at) VALUES (?, ?, ?, ?, NULL, ?, ?)",
  );
  for (const user of [OWNER, MEMBER]) insertUser.run(user.id, `email:${user.email}`, user.email, user.name, now, now);
  database
    .prepare(
      "INSERT INTO remote_hosts(host_id, owner_user_id, name, created_at, updated_at) VALUES (?, ?, 'Test Host', ?, ?)",
    )
    .run(HOST_ID, OWNER.id, now, now);
  database
    .prepare(
      `INSERT INTO remote_memberships(membership_id, host_id, user_id, role, status, created_at, updated_at)
       VALUES ('membership-owner', ?, ?, 'owner', 'active', ?, ?)`,
    )
    .run(HOST_ID, OWNER.id, now, now);

  const { publicKey, privateKey } = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
    "sign",
    "verify",
  ]);
  const publicJwk = await crypto.subtle.exportKey("jwk", publicKey);
  const privateJwk = await crypto.subtle.exportKey("jwk", privateKey);
  const plane = new RemoteControlPlane({
    DB: sqliteD1(database),
    REMOTE_TICKET_PRIVATE_JWK: JSON.stringify({ ...privateJwk, kid: "ticket-1" }),
    REMOTE_TICKET_PUBLIC_JWKS: JSON.stringify({ keys: [{ ...publicJwk, kid: "ticket-1" }] }),
    REMOTE_TICKET_KEY_ID: "ticket-1",
  });
  const sent: Parameters<TeamInviteEmailDelivery["send"]>[0][] = [];
  const delivery: TeamInviteEmailDelivery = { send: (message) => Effect.sync(() => void sent.push(message)) };
  const services: TeamInviteEmailServices = {
    auth: { enforceTeamInviteRateLimit: () => Effect.void },
    remote: plane,
    delivery: () => delivery,
  };
  const fingerprint = Buffer.alloc(32, 0x37).toString("base64url");
  const invite = await Effect.runPromise(
    plane.createInvite(OWNER, { hostId: HOST_ID, role: "member", email: RECIPIENT }),
  );
  const makeLink = (apiUrl: string, token = invite.token) =>
    createInviteUrl(
      { apiUrl, serverId: HOST_ID, fingerprint, token },
      { selfHostedApiOrigin: apiUrl.startsWith("https://account.example.test") ? SELF_HOST : undefined },
    );
  const selfHostedLink = makeLink(`${SELF_HOST}/`);
  const upstreamLink = makeLink("https://api.openbot.run/");
  const body = { email: RECIPIENT, role: "member" as const, inviteUrl: selfHostedLink };
  async function send(
    input: { email: string; role: "member" | "admin"; inviteUrl: string },
    origin: string | undefined,
    user: AuthUser = OWNER,
  ): Promise<string | null> {
    const result = await Effect.runPromise(
      Effect.result(sendTeamInviteEmail(services, user, input, "127.0.0.1", origin)),
    );
    return result._tag === "Success"
      ? null
      : "code" in result.failure
        ? String(result.failure.code)
        : result.failure.constructor.name;
  }

  check("self-host link uses app protocol", new URL(selfHostedLink).protocol === "openbot:");
  check(
    "self-host link keeps the configured API",
    parseInviteUrl(selfHostedLink, { selfHostedApiOrigin: SELF_HOST }).apiUrl === `${SELF_HOST}/`,
  );
  check("upstream link keeps the released web format", new URL(upstreamLink).pathname === "/join");

  const success = await send(body, SELF_HOST);
  check("configured self-host invitation sends", success === null, success);
  check(
    "mail contains only the trusted invitation and recipient",
    sent.length === 1 &&
      sent[0]?.inviteUrl === selfHostedLink &&
      sent[0]?.email === RECIPIENT &&
      sent[0]?.serverName === "Test Host" &&
      sent[0]?.selfHostedApiOrigin === SELF_HOST,
  );

  const refused = [
    ["missing origin refuses a self-host link", body, undefined, OWNER],
    ["wrong origin refuses a self-host link", body, OTHER_HOST, OWNER],
    ["self-hosted service refuses an upstream link", { ...body, inviteUrl: upstreamLink }, SELF_HOST, OWNER],
    ["wrong recipient is refused", { ...body, email: "other@example.test" }, SELF_HOST, OWNER],
    ["wrong role is refused", { ...body, role: "admin" as const }, SELF_HOST, OWNER],
    ["host member cannot send invitations", body, SELF_HOST, MEMBER],
  ] as const;
  for (const [name, input, origin, user] of refused) {
    const code = await send(input, origin, user);
    check(name, code === "invalid_invitation", code);
  }
  check("refused requests send no mail", sent.length === 1);

  const legacy = await send({ ...body, inviteUrl: upstreamLink }, undefined);
  check("released upstream invitation remains accepted", legacy === null, legacy);
  check("upstream mail adds no self-host origin", sent.length === 2 && sent[1]?.selfHostedApiOrigin === undefined);

  await Effect.runPromise(plane.revokeInvite(OWNER.id, invite.inviteId));
  const revoked = await send(body, SELF_HOST);
  check("revoked link cannot send mail", revoked === "invalid_invitation" && sent.length === 2, revoked);
} catch (error) {
  check(
    "invitation end-to-end execution",
    false,
    error instanceof Error && "code" in error
      ? String(error.code)
      : error instanceof Error
        ? error.name
        : "unknown_error",
  );
} finally {
  database.close();
  await mkdir(OUT, { recursive: true });
  const report = { passed: checks.every((entry) => entry.passed), checks };
  await writeFile(join(OUT, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  for (const entry of checks) process.stdout.write(`${entry.passed ? "PASS" : "FAIL"} ${entry.name}\n`);
  process.stdout.write(`Report: ${join(OUT, "report.json")}\n`);
  if (!report.passed) process.exitCode = 1;
}
