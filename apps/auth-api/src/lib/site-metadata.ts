// No Vite-only import belongs in this file. `vite.config.ts` reads it, through the
// news artwork generator, while plain Node loads the config, and Node cannot
// resolve an `?url` specifier. That is why the font asset arrives as an argument
// from the root route instead of as an import here.

import { LANDING_FAQ_STRUCTURED_DATA } from "./landing-faq";
import { OPENBOT_ALTERNATE_DOWNLOAD_LINKS, OPENBOT_DOWNLOAD_LINKS } from "./landing-links";

export const OPENBOT_SITE_URL = "https://openbot.run/";
export const OPENBOT_SITE_TITLE = "OpenBotFR: Run AI agents on your own computer";
export const OPENBOT_SITE_DESCRIPTION =
  "OpenBotFR (OpenBot For Real) is an independent, local-first fork. Run AI agents with no desktop account, optional self-hosting, and Kilo Code ACP support. Free for noncommercial use.";
export const OPENBOT_SOCIAL_IMAGE_URL = `${OPENBOT_SITE_URL}openbot-social.png`;
/** The account `OPENBOT_LINKS.x` opens, which a shared card names. */
export const OPENBOT_X_HANDLE = "@OpenBot_";
const OPENBOT_REPOSITORY_URL = "https://github.com/daMustermann/openbotfr";
const OPENBOT_LICENSE_URL = "https://polyformproject.org/licenses/noncommercial/1.0.0/";
/** Square, as schema.org wants for a publisher logo. */
export const OPENBOT_LOGO_URL = `${OPENBOT_SITE_URL}icon-512x512.png`;
export const OPENBOT_SOCIAL_IMAGE_ALT = "OpenBotFR AI agent workspace";

/** The Open Graph tags of the site's own social card, which is 1600x900. */
export const OPENBOT_SOCIAL_IMAGE_META = [
  { property: "og:image", content: OPENBOT_SOCIAL_IMAGE_URL },
  { property: "og:image:type", content: "image/png" },
  { property: "og:image:width", content: "1600" },
  { property: "og:image:height", content: "900" },
  { property: "og:image:alt", content: OPENBOT_SOCIAL_IMAGE_ALT },
] as const;

export function openBotSocialImageUrl(siteUrl: string): string {
  return new URL("openbot-social.png", siteUrl).toString();
}

export function openBotSocialImageMeta(siteUrl: string) {
  return [
    { property: "og:image", content: openBotSocialImageUrl(siteUrl) },
    { property: "og:image:type", content: "image/png" },
    { property: "og:image:width", content: "1600" },
    { property: "og:image:height", content: "900" },
    { property: "og:image:alt", content: OPENBOT_SOCIAL_IMAGE_ALT },
  ];
}

/**
 * Use the serving origin for public metadata. Fork operators can use their own
 * domain. The legacy site URL remains for released account callback routes.
 */
export function siteUrlForPage(pageUrl: URL): string {
  return `${pageUrl.origin}/`;
}

/** What the app's structured data names and that this file can not import: see the note at the top. */
export interface OpenBotApplicationFacts {
  /** The version of the newest release. */
  version: string;
  /** An image path that resolves against the serving site URL. */
  screenshot: string;
}

export function openBotSoftwareApplication(facts: OpenBotApplicationFacts, siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${siteUrl}#app`,
    name: "OpenBotFR",
    url: siteUrl,
    image: new URL("openbot-social.png", siteUrl).toString(),
    description: OPENBOT_SITE_DESCRIPTION,
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "AI agent app",
    operatingSystem: [
      "macOS 13 or later (Apple silicon or Intel)",
      "Windows 10 or later (x64)",
      "Linux (x64 or arm64)",
    ],
    // The installers themselves: schema.org's `downloadUrl` is the file, not a page about it.
    downloadUrl: [
      OPENBOT_DOWNLOAD_LINKS.macos,
      OPENBOT_ALTERNATE_DOWNLOAD_LINKS.macos,
      OPENBOT_DOWNLOAD_LINKS.windows,
      OPENBOT_DOWNLOAD_LINKS.linux,
      OPENBOT_ALTERNATE_DOWNLOAD_LINKS.linux,
    ].map((path) => new URL(path, siteUrl).toString()),
    // What people ask an assistant for. Keep it to what the released app does.
    featureList: [
      "Runs Codex, Kilo Code ACP, Claude Code, Gemini (Antigravity), Grok and OpenCode agents",
      "Uses your ChatGPT, Claude, Google AI Pro or Ultra, or Grok plan",
      "Any OpenAI-compatible model server, also one on your own computer",
      "Agents that work as a team and keep their workspace and history",
      "Chats, files and workspaces stay on your computer",
      "Optional self-hosted account and remote access services",
      "No desktop account required for local use",
      "Free for noncommercial use",
    ],
    isAccessibleForFree: true,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    softwareVersion: facts.version,
    screenshot: new URL(facts.screenshot, siteUrl).toString(),
    license: OPENBOT_LICENSE_URL,
    publisher: { "@id": `${siteUrl}#organization` },
    sameAs: [OPENBOT_REPOSITORY_URL],
  } as const;
}

export type OpenBotSoftwareApplication = ReturnType<typeof openBotSoftwareApplication>;

// Search engines read these two for the site name and the logo next to a result.
export const OPENBOT_SECURITY_HEADERS = {
  "Permissions-Policy": "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
} as const;

/**
 * @param interLatinFont The hashed URL of Inter's upright latin range, the one font
 * file this site downloads. It is reached through two levels of CSS `@import`, so a
 * browser only learns of it after the stylesheet has parsed. That is late enough
 * that the first paint uses a fallback face and every line of text moves when Inter
 * replaces it. The caller passes the same hashed asset the `@font-face` rule asks
 * for, so the preload below is that request and not a second one.
 */
export function openBotRootHead(interLatinFont: string) {
  return {
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: OPENBOT_SITE_TITLE },
      { name: "description", content: OPENBOT_SITE_DESCRIPTION },
      { name: "application-name", content: "OpenBotFR" },
      { name: "color-scheme", content: "dark" },
      { name: "theme-color", content: "#1a1a1a" },
    ],
    links: [
      {
        rel: "preload",
        as: "font" as const,
        type: "font/woff2",
        href: interLatinFont,
        crossorigin: "anonymous" as const,
      },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "icon", href: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
      { rel: "manifest", href: "/site.webmanifest" },
    ],
  };
}

export function openBotHomeHead(facts: OpenBotApplicationFacts, siteUrl: string) {
  const application = openBotSoftwareApplication(facts, siteUrl);
  const socialImage = new URL("openbot-social.png", siteUrl).toString();
  const organizationId = `${siteUrl}#organization`;
  return {
    meta: [
      { "script:ld+json": application },
      {
        "script:ld+json": {
          "@context": "https://schema.org",
          "@type": "Organization",
          "@id": organizationId,
          name: "OpenBotFR",
          url: siteUrl,
          logo: new URL("icon-512x512.png", siteUrl).toString(),
          sameAs: [OPENBOT_REPOSITORY_URL],
        },
      },
      {
        "script:ld+json": {
          "@context": "https://schema.org",
          "@type": "WebSite",
          "@id": `${siteUrl}#website`,
          name: "OpenBotFR",
          url: siteUrl,
          publisher: { "@id": organizationId },
        },
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "OpenBotFR" },
      { property: "og:locale", content: "en_US" },
      { property: "og:url", content: siteUrl },
      { property: "og:title", content: OPENBOT_SITE_TITLE },
      { property: "og:description", content: OPENBOT_SITE_DESCRIPTION },
      { property: "og:image", content: socialImage },
      { property: "og:image:type", content: "image/png" },
      { property: "og:image:width", content: "1600" },
      { property: "og:image:height", content: "900" },
      { property: "og:image:alt", content: OPENBOT_SOCIAL_IMAGE_ALT },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: OPENBOT_SITE_TITLE },
      { name: "twitter:description", content: OPENBOT_SITE_DESCRIPTION },
      { name: "twitter:image", content: socialImage },
      { name: "twitter:image:alt", content: OPENBOT_SOCIAL_IMAGE_ALT },
      { "script:ld+json": LANDING_FAQ_STRUCTURED_DATA },
    ],
    links: [{ rel: "canonical", href: siteUrl }],
  };
}
