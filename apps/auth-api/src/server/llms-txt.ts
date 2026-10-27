// `/llms.txt` (llmstxt.org): the site as one short Markdown file, for an assistant
// that answers a question about OpenBot. Built from the same registries as the
// sitemap, so a new article or comparison is in it with no edit here.

import { COMPARISONS } from "../content/compare";
import { OPENBOT_PLANS } from "../content/compare/comparison";
import { PROVIDER_PAGES } from "../content/providers";
import { CHANGELOG_DESCRIPTION, changelogUrl } from "../lib/changelog";
import { CONTENT_COLLECTIONS } from "../lib/content";
import { articleUrl, type CollectionId, collectionIndexUrl } from "../lib/content-collection";
import {
  OPENBOT_ALTERNATE_DOWNLOAD_LINKS,
  OPENBOT_DOWNLOAD_LINKS,
  OPENBOT_DOWNLOAD_PAGE_LINKS,
  OPENBOT_LINKS,
} from "../lib/landing-links";
import { PLUGINS_DESCRIPTION, pluginIndexUrl } from "../lib/plugins";
import { OPENBOT_SITE_DESCRIPTION, siteUrlForPage } from "../lib/site-metadata";
import { FEED_CACHE_CONTROL } from "./content-feed";

/** The one-sentence answer of a page drawn from data. A prose article has none, and uses its description. */
function referenceAnswer(collection: CollectionId, slug: string): string | undefined {
  if (collection === "compare") return COMPARISONS[slug]?.answer;
  if (collection === "providers") return PROVIDER_PAGES[slug]?.answer;
  return undefined;
}

function absolute(path: string, siteUrl: string): string {
  return new URL(path, siteUrl).href;
}

function llmsTxt(siteUrl: string): string {
  const lines = [
    "# OpenBotFR",
    "",
    `> ${OPENBOT_SITE_DESCRIPTION}`,
    "",
    "OpenBotFR is a desktop app for macOS, Windows and Linux. Each agent has its own workspace, thread and history, and keeps them when you change its provider or restart the app. Agents can give work to other agents, and can move to a backup model on another provider when a plan reaches its limit. Chats, files and workspaces stay on your computer. No desktop account is required. Optional remote access uses your own self-hosted services. The app is free for noncommercial use.",
    "",
    `Each article below also has its text as Markdown, at its URL with \`.md\` added. [llms-full.txt](${absolute("/llms-full.txt", siteUrl)}) holds all of them in one file.`,
    "",
    "## Models and plans",
    "",
    "OpenBotFR sells no model. Each agent uses a plan or a key you already have:",
    "",
    ...OPENBOT_PLANS.map((plan) => `- ${plan.name}: ${plan.plan}`),
    "",
    "## Download",
    "",
    `System requirements and install steps: [macOS](${absolute(OPENBOT_DOWNLOAD_PAGE_LINKS.macos, siteUrl)}), [Windows](${absolute(OPENBOT_DOWNLOAD_PAGE_LINKS.windows, siteUrl)}), [Linux](${absolute(OPENBOT_DOWNLOAD_PAGE_LINKS.linux, siteUrl)}), [iPhone](${absolute(OPENBOT_DOWNLOAD_PAGE_LINKS.ios, siteUrl)}), [Android](${absolute(OPENBOT_DOWNLOAD_PAGE_LINKS.android, siteUrl)}).`,
    "",
    `- [macOS](${absolute(OPENBOT_DOWNLOAD_LINKS.macos, siteUrl)}): macOS 13 or later, Apple silicon`,
    `- [macOS for Intel](${absolute(OPENBOT_ALTERNATE_DOWNLOAD_LINKS.macos, siteUrl)}): macOS 13 or later, Intel`,
    `- [Windows](${absolute(OPENBOT_DOWNLOAD_LINKS.windows, siteUrl)}): Windows 10 or later, x64`,
    `- [Linux](${absolute(OPENBOT_DOWNLOAD_LINKS.linux, siteUrl)}): x64 AppImage`,
    `- [Linux for arm64](${absolute(OPENBOT_ALTERNATE_DOWNLOAD_LINKS.linux, siteUrl)}): arm64 AppImage`,
    `- [Source code](${OPENBOT_LINKS.repository}): PolyForm Noncommercial 1.0.0`,
    "",
  ];

  for (const collection of CONTENT_COLLECTIONS) {
    lines.push(
      `## ${collection.name}`,
      "",
      `${collection.indexDescription} [All](${collectionIndexUrl(collection, siteUrl)})`,
      "",
    );
    for (const article of collection.articles) {
      const answer = referenceAnswer(collection.id, article.slug);
      lines.push(
        `- [${article.title}](${articleUrl(collection, article.slug, siteUrl)}): ${answer ?? article.description}`,
      );
    }
    lines.push("");
  }

  lines.push(
    "## Optional",
    "",
    `- [Plugins](${pluginIndexUrl(siteUrl)}): ${PLUGINS_DESCRIPTION}`,
    `- [Changelog](${changelogUrl(siteUrl)}): ${CHANGELOG_DESCRIPTION}`,
    "",
  );
  return lines.join("\n");
}

export function llmsTxtResponse({ request }: { request: Request }): Response {
  return new Response(llmsTxt(siteUrlForPage(new URL(request.url))), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": FEED_CACHE_CONTROL,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
