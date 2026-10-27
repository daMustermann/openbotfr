// Verify the public fork download data and generated page metadata without network access.
// Run: bun apps/auth-api/scripts/fork-download-pages-e2e.ts
// Writes .openbot-build/fork-download-pages-e2e/report.json.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { DOWNLOAD_HUB, DOWNLOAD_PAGE_ORDER, DOWNLOAD_PAGES, downloadPageHead } from "../src/lib/download-pages";
import { DOWNLOAD_PLATFORMS } from "../src/lib/download-platforms";
import { LANDING_FAQ } from "../src/lib/landing-faq";
import { FOOTER_COLUMNS, OPENBOT_LINKS } from "../src/lib/landing-links";
import { MOBILE_APPS } from "../src/lib/mobile-apps";

const OUTPUT = join(resolve(import.meta.dirname, "../../.."), ".openbot-build", "fork-download-pages-e2e");
const FORK = "https://github.com/daMustermann/openbotfr";
const SITE = "https://fork-download-test.invalid/";
let checks = 0;
let error: string | undefined;

function check(run: () => void) {
  run();
  checks += 1;
}

try {
  check(() => assert.equal(OPENBOT_LINKS.releases, `${FORK}/releases`));
  check(() => assert.equal(DOWNLOAD_PAGE_ORDER.length, 5));
  check(() => assert.match(DOWNLOAD_HUB.description, /no central account/i));

  for (const platform of ["macos", "windows", "linux"] as const) {
    const page = DOWNLOAD_PAGES[platform];
    const head = downloadPageHead(platform, SITE);
    check(() => assert.match(page.heading, /^OpenBotFR/));
    check(() => assert.equal(DOWNLOAD_PLATFORMS[platform].status, "Fork releases"));
    check(() => assert.equal(page.specs.find((spec) => spec.label === "Updates")?.value, "Manual"));
    check(() => assert.ok(page.notes.some((note) => note.includes("does not install updates automatically"))));
    check(() => assert.ok(page.installers.every((installer) => installer.href.startsWith("/download/"))));
    check(() => assert.ok(head.links.some((link) => link.rel === "canonical" && link.href.startsWith(SITE))));
  }

  check(() => assert.ok(DOWNLOAD_PAGES.linux.installSteps.some((step) => step.code?.includes("OpenBotFR-*.AppImage"))));
  check(() => assert.ok(DOWNLOAD_PAGES.linux.extraSections.some((part) => part.title.includes("self-hosting"))));
  check(() =>
    assert.ok(
      DOWNLOAD_PAGES.linux.extraSections.every((section) =>
        section.steps.every((step) => !step.code?.includes("raw.githubusercontent.com/nightly-labs")),
      ),
    ),
  );

  for (const platform of ["ios", "android"] as const) {
    const page = DOWNLOAD_PAGES[platform];
    const app = MOBILE_APPS[platform];
    check(() => assert.equal(app.status, "Source only"));
    check(() => assert.equal(app.href, `${FORK}/tree/main/apps/mobile`));
    check(() => assert.equal(page.installers[0]?.href, app.href));
    check(() => assert.ok(page.specs.some((spec) => spec.label === "Release" && spec.value === "Source only")));
    check(() => assert.ok(page.notes.some((note) => note.includes("optional"))));
  }

  check(() => assert.ok(LANDING_FAQ.some((entry) => entry.answer.includes("Kilo Code (ACP)"))));
  check(() => assert.ok(LANDING_FAQ.some((entry) => entry.answer.includes("PolyForm Noncommercial 1.0.0"))));
  check(() =>
    assert.ok(
      FOOTER_COLUMNS.flatMap((column) => column.links)
        .filter((link) => link.external)
        .every((link) => !/openbot\.run|nightly-labs|discord\.openbot|x\.com\/OpenBot_/i.test(link.href)),
    ),
  );
} catch (cause) {
  error = cause instanceof Error ? cause.message : String(cause);
} finally {
  await mkdir(OUTPUT, { recursive: true });
  await writeFile(join(OUTPUT, "report.json"), `${JSON.stringify({ passed: !error, checks, error }, null, 2)}\n`);
  process.stdout.write(`${error ? `FAIL: ${error}` : `PASS: ${checks} checks`}: ${join(OUTPUT, "report.json")}\n`);
  if (error) process.exitCode = 1;
}
