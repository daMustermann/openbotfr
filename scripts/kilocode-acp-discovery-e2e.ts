// Check the Kilo Code ACP preset with the real Windows command scanner.
// The scanner must find a Windows CLI shim without starting it.
// Run: bun scripts/kilocode-acp-discovery-e2e.ts
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { ACP_AGENT_PRESETS } from "@openbot/contracts/ipc";
import { Effect } from "effect";
import { scanAcpAgents } from "../src/backend/acp-agent-scan";

const OUT = resolve(import.meta.dirname, "../.openbot-build/kilocode-acp-discovery-e2e");
const root = await mkdtemp(join(tmpdir(), "openbotfr-kilocode-discovery-"));
const report: { passed: boolean; checks: string[]; error?: string } = { passed: false, checks: [] };

try {
  const preset = ACP_AGENT_PRESETS.find((candidate) => candidate.id === "kilocode");
  assert.ok(preset, "Kilo Code has an ACP preset.");
  assert.equal(preset.name, "Kilo Code");
  assert.equal(preset.command, "kilo");
  assert.deepEqual(preset.args, ["acp"]);
  report.checks.push("Kilo Code ACP preset");

  const bin = join(root, "bin");
  await mkdir(bin);
  const cmd = join(bin, "kilo.cmd");
  const executionMarker = join(bin, "started.txt");
  await writeFile(cmd, "@echo off\r\necho started > %~dp0started.txt\r\n");

  const found = await Effect.runPromise(
    scanAcpAgents({ folders: [bin], takenIds: new Set(), presets: [preset], platform: "win32" }),
  );
  assert.deepEqual(found, [{ id: "kilocode", name: "Kilo Code", command: cmd, args: ["acp"] }]);
  report.checks.push("Windows .cmd discovery");

  const renamed = await Effect.runPromise(
    scanAcpAgents({ folders: [bin], takenIds: new Set(["kilocode"]), presets: [preset], platform: "win32" }),
  );
  assert.deepEqual(renamed, [{ id: "kilocode-2", name: "Kilo Code", command: cmd, args: ["acp"] }]);
  report.checks.push("Duplicate agent ID handling");

  const markerExists = await readFile(executionMarker, "utf8").then(
    () => true,
    () => false,
  );
  assert.equal(markerExists, false, "Scanning must not run the CLI shim.");
  report.checks.push("Discovery does not run the CLI");
  report.passed = true;
} catch (error) {
  report.error = error instanceof Error ? error.message : "Unknown failure";
  process.exitCode = 1;
} finally {
  await mkdir(OUT, { recursive: true });
  await writeFile(join(OUT, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  await rm(root, { recursive: true, force: true });
}

for (const check of report.checks) process.stdout.write(`PASS ${check}\n`);
if (report.error) process.stderr.write(`FAIL ${report.error}\n`);
process.stdout.write(`Report: ${join(OUT, "report.json")}\n`);
