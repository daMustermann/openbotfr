// Check public installer redirects without downloading a release or using the network.
// Run: bun apps/auth-api/scripts/fork-download-e2e.ts
// The report is written to .openbot-build/fork-download-e2e/report.json.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { Effect } from "effect";
import { OPENBOT_LINKS } from "../src/lib/landing-links";
import {
  type AvailableDownloadPlatform,
  type DownloadArchitecture,
  downloadArchitecture,
  latestDownloadResponse,
} from "../src/server/latest-download";

const OUTPUT = join(resolve(import.meta.dirname, "../../.."), ".openbot-build", "fork-download-e2e");
const RELEASES = "https://github.com/daMustermann/openbotfr/releases";
const requests: string[] = [];
let checks = 0;
let error: string | undefined;

async function expectRedirect(
  platform: AvailableDownloadPlatform,
  architecture: DownloadArchitecture,
  manifest: string,
  expectedLocation: string,
  status = 200,
) {
  const fetcher: typeof fetch = Object.assign(
    async (input: Parameters<typeof fetch>[0]) => {
      requests.push(String(input));
      return new Response(manifest, { status });
    },
    { preconnect: () => {} },
  );
  const response = await Effect.runPromise(latestDownloadResponse(platform, fetcher, architecture));
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), expectedLocation);
  assert.equal(response.headers.get("cache-control"), "no-store");
  checks += 1;
}

try {
  assert.equal(OPENBOT_LINKS.releases, RELEASES);
  assert.equal(downloadArchitecture("macos", null), "arm64");
  assert.equal(downloadArchitecture("windows", "arm64"), "x64");
  assert.equal(downloadArchitecture("linux", "arm64"), "arm64");
  checks += 4;

  await expectRedirect(
    "windows",
    "x64",
    "- url: OpenBotFR-Setup-1.0.exe",
    `${RELEASES}/latest/download/OpenBotFR-Setup-1.0.exe`,
  );
  await expectRedirect(
    "linux",
    "arm64",
    "- url: OpenBotFR-1.0-arm64.AppImage",
    `${RELEASES}/latest/download/OpenBotFR-1.0-arm64.AppImage`,
  );
  await expectRedirect(
    "macos",
    "x64",
    "- url: OpenBotFR-1.0-arm64.dmg\n- url: OpenBotFR-1.0.dmg",
    `${RELEASES}/latest/download/OpenBotFR-1.0.dmg`,
  );
  await expectRedirect("linux", "x64", "not an installer", RELEASES);
  await expectRedirect("windows", "x64", "not found", RELEASES, 404);

  const offlineFetcher: typeof fetch = Object.assign(
    async (input: Parameters<typeof fetch>[0]) => {
      requests.push(String(input));
      throw new Error("offline");
    },
    { preconnect: () => {} },
  );
  const offline = await Effect.runPromise(latestDownloadResponse("macos", offlineFetcher));
  assert.equal(offline.headers.get("location"), RELEASES);
  checks += 1;

  assert.ok(requests.length === 6);
  assert.ok(requests.every((url) => url.startsWith(`${RELEASES}/latest/download/`)));
  assert.ok(requests.every((url) => !url.includes("nightly-labs")));
  checks += 3;
} catch (cause) {
  error = cause instanceof Error ? cause.message : String(cause);
} finally {
  await mkdir(OUTPUT, { recursive: true });
  await writeFile(
    join(OUTPUT, "report.json"),
    `${JSON.stringify({ passed: !error, checks, requests, error }, null, 2)}\n`,
  );
  process.stdout.write(`${error ? `FAIL: ${error}` : `PASS: ${checks} checks`}: ${join(OUTPUT, "report.json")}\n`);
  if (error) process.exitCode = 1;
}
