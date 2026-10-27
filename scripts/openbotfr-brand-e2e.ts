// Check the text that desktop, mobile, and remote error screens show.
// Released error messages must keep their original bytes on the wire.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { localizeSourceText, sourceText, TRANSLATED_LOCALES, translateFor } from "@openbot/i18n";
import { mobileTranslateFor } from "@openbot/i18n/mobile";

const legacyBrand = /\bOpenBot\b/u;
const originalError = sourceText("error.app.notReady");
assert.equal(originalError, "OpenBot is not ready.");

let checks = 1;
for (const locale of TRANSLATED_LOCALES) {
  const desktop = translateFor(locale)("app.loading");
  const mobile = mobileTranslateFor(locale)("mobile.agent.files.deleteFailedBody");
  const remoteError = localizeSourceText(originalError, locale);
  assert.doesNotMatch(desktop, legacyBrand, `${locale} desktop`);
  assert.doesNotMatch(mobile, legacyBrand, `${locale} mobile`);
  assert.doesNotMatch(remoteError, legacyBrand, `${locale} error`);
  checks += 3;
}

assert.equal(
  translateFor("en")("chat.suggestion.localOnly", { name: "OpenBot" }),
  "Connect OpenBot in OpenBotFR on your own computer.",
);
checks++;

const outputDirectory = resolve(import.meta.dirname, "../.openbot-build/openbotfr-brand-e2e");
mkdirSync(outputDirectory, { recursive: true });
writeFileSync(
  resolve(outputDirectory, "report.json"),
  `${JSON.stringify({ result: "pass", checks, locales: TRANSLATED_LOCALES }, null, 2)}\n`,
);
process.stdout.write(`PASS: ${checks} checks in ${TRANSLATED_LOCALES.length} locales\n`);
