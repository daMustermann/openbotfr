// Check public site responses and metadata without sending network requests.
// Run: bun apps/auth-api/scripts/fork-public-site-e2e.ts
// Writes .openbot-build/fork-public-site-e2e/report.json.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { changelogHead } from "../src/lib/changelog";
import { CONTENT_COLLECTIONS } from "../src/lib/content";
import { SITE_NAVIGATION_LINKS } from "../src/lib/site-navigation";
import { brandAssetResponse } from "../src/server/brand-asset";
import { contentRssResponse, contentSitemapResponse } from "../src/server/content-feed";
import { llmsTxtResponse } from "../src/server/llms-txt";

const OUTPUT = join(resolve(import.meta.dirname, "../../.."), ".openbot-build", "fork-public-site-e2e");
const SITE = "https://fork-public-test.invalid/";
let checks = 0;
let error: string | undefined;

function check(run: () => void): void {
  run();
  checks += 1;
}

try {
  const sitemapResponse = contentSitemapResponse({ request: new Request(`${SITE}sitemap.xml`) });
  const sitemap = await sitemapResponse.text();
  const urls = Array.from(sitemap.matchAll(/<loc>(.*?)<\/loc>/g), ([, url]) => url);

  check(() => assert.equal(sitemapResponse.status, 200));
  check(() => assert.match(sitemapResponse.headers.get("Content-Type") ?? "", /application\/xml/));
  check(() => assert.ok(urls.length > 20));
  check(() => assert.ok(urls.every((url) => url?.startsWith(SITE))));
  check(() => assert.ok(urls.includes(`${SITE}download/windows`)));
  check(() => assert.ok(!urls.some((url) => /\/(brand|teams|contact|terms|privacy-policy)(?:\/|$)/.test(url ?? ""))));
  check(() => assert.ok(!sitemap.includes("openbot.run")));

  const llmsResponse = llmsTxtResponse({ request: new Request(`${SITE}llms.txt`) });
  const llmsContent = await llmsResponse.text();
  check(() => assert.equal(llmsResponse.status, 200));
  check(() => assert.ok(llmsContent.startsWith("# OpenBotFR\n")));
  check(() => assert.ok(llmsContent.includes(`${SITE}download/windows`)));
  check(() => assert.ok(llmsContent.includes(`${SITE}llms-full.txt`)));
  check(() => assert.ok(!llmsContent.includes("https://openbot.run/")));

  for (const collection of CONTENT_COLLECTIONS) {
    const response = contentRssResponse(collection, new Request(`${SITE}${collection.id}/rss.xml`));
    const feed = await response.text();
    check(() => assert.equal(response.status, 200));
    check(() => assert.match(response.headers.get("Content-Type") ?? "", /application\/rss\+xml/));
    check(() => assert.ok(feed.includes(`href="${SITE}${collection.indexRoute.slice(1)}/rss.xml"`)));
    check(() => assert.ok(feed.includes(`${SITE}${collection.indexRoute.slice(1)}`)));
    check(() => assert.ok(!feed.includes("https://openbot.run/")));
  }

  const head = changelogHead(SITE);
  check(() => assert.ok(head.links.some((link) => link.rel === "canonical" && link.href === `${SITE}changelog`)));
  check(() =>
    assert.ok(
      head.meta.some((meta) => "property" in meta && meta.property === "og:site_name" && meta.content === "OpenBotFR"),
    ),
  );
  check(() =>
    assert.ok(
      head.meta.some(
        (meta) => "property" in meta && meta.property === "og:image" && meta.content === `${SITE}openbot-social.png`,
      ),
    ),
  );
  check(() => assert.equal(SITE_NAVIGATION_LINKS.length, 0));

  const oldWordmark = brandAssetResponse("openbot-logo-lilac-dark.svg");
  const oldWordmarkBody = await oldWordmark.text();
  check(() => assert.equal(oldWordmark.status, 410));
  check(() => assert.equal(oldWordmark.headers.get("Cache-Control"), "no-store"));
  check(() => assert.equal(oldWordmarkBody.includes("<svg"), false));
} catch (cause) {
  error = cause instanceof Error ? (cause.stack ?? cause.message) : String(cause);
} finally {
  await mkdir(OUTPUT, { recursive: true });
  await writeFile(join(OUTPUT, "report.json"), `${JSON.stringify({ passed: !error, checks, error }, null, 2)}\n`);
  process.stdout.write(`${error ? `FAIL: ${error}` : `PASS: ${checks} checks`}: ${join(OUTPUT, "report.json")}\n`);
  if (error) process.exitCode = 1;
}
