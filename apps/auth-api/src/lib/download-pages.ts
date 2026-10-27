// The /download pages: one per operating system and phone app, and a hub that lists them. Each
// statement here comes from the release configuration, README.md or docs/TROUBLESHOOTING.md, and for
// the phone apps from the native module minimums, the Mobile Connect settings and the mobile changelog. Keep it to what the
// released app does, because these pages are what a search engine shows for "OpenBot for Linux".

import { DOWNLOAD_PLATFORM_ORDER, type DownloadPlatform } from "./download-platforms";
import { LANDING_FAQ, type LandingQuestion } from "./landing-faq";
import { OPENBOT_ALTERNATE_DOWNLOAD_LINKS, OPENBOT_DOWNLOAD_LINKS, OPENBOT_DOWNLOAD_PAGE_LINKS } from "./landing-links";
import { MOBILE_APP_ORDER, MOBILE_APPS, type MobilePlatform } from "./mobile-apps";
import {
  OPENBOT_SITE_URL,
  OPENBOT_SOCIAL_IMAGE_ALT,
  openBotSocialImageMeta,
  openBotSocialImageUrl,
  openBotSoftwareApplication,
} from "./site-metadata";
import { OPENBOT_SOFTWARE_APPLICATION_FACTS } from "./software-application";

/** The sitemap date of the pages. Change it when their text changes. */
export const DOWNLOAD_PAGES_UPDATED_AT = "2026-10-27";

/** A system with its own page: a desktop installer or a phone app. */
export type DownloadPagePlatform = DownloadPlatform | MobilePlatform;

/** The desktop systems first, then the phone apps, as the hub and the landing page list them. */
export const DOWNLOAD_PAGE_ORDER: readonly DownloadPagePlatform[] = [...DOWNLOAD_PLATFORM_ORDER, ...MOBILE_APP_ORDER];

export interface DownloadInstaller {
  /** The button text where the system is not on screen, such as a list of every installer. */
  label: string;
  /** The button text inside a card or panel that already names the system. */
  shortLabel: string;
  /** Which computer the file is for, for a reader who has to choose between two. */
  detail: string;
  href: string;
  /** A store page on another site, which opens in a new tab. */
  external?: boolean;
}

/** One line of the spec sheet: what the computer needs, or what the download is. */
interface DownloadSpec {
  label: string;
  value: string;
}

/** One instruction. `code` is a command to copy, shown under the text. */
export interface DownloadStep {
  text: string;
  code?: string;
}

interface DownloadPageSection {
  title: string;
  steps: readonly DownloadStep[];
}

export interface DownloadPageContent {
  platform: DownloadPagePlatform;
  /** The name a reader uses for the system, which the headings and the breadcrumb show. */
  name: string;
  title: string;
  description: string;
  heading: string;
  intro: string;
  installers: readonly DownloadInstaller[];
  specs: readonly DownloadSpec[];
  installSteps: readonly DownloadStep[];
  /** Optional steps for one situation, such as a distribution that needs a security profile. */
  extraSections: readonly DownloadPageSection[];
  notes: readonly string[];
  faq: readonly LandingQuestion[];
  /** schema.org `operatingSystem` for this page's installer. */
  operatingSystem: string;
}

const PROVIDERS_ANSWER = LANDING_FAQ.find((entry) => entry.question === "Which AI models can OpenBotFR use?")?.answer;
const FREE_ANSWER =
  "Yes. OpenBotFR is free for noncommercial use under PolyForm Noncommercial 1.0.0. You pay your AI provider if its service has a fee.";
const CONNECT_STEP: DownloadStep = {
  text: "Connect a provider, such as Codex with your ChatGPT plan or Claude Code with your Claude plan. Then describe the agent you want in one prompt and save it.",
};
const UPDATES_NOTE =
  "OpenBotFR does not install updates automatically. Check the fork's GitHub releases for new versions.";
const NETWORK_NOTE = "The AI provider you choose needs an internet connection. A local model needs none.";
const UPDATES_SPEC: DownloadSpec = { label: "Updates", value: "Manual" };

const COMPUTER_STEP: DownloadStep = {
  text: "Install OpenBotFR on the Mac, Windows or Linux computer that runs your agents. The desktop app works without an OpenBot account.",
};
const GENERATE_CODE_STEP: DownloadStep = {
  text: "On the computer, open Settings, then Mobile Connect, and select Generate QR code. The code expires after two minutes and works for one sign-in.",
};
const PHONE_NOTES = [
  "Your chats and files stay on the computer that runs your agents. A configured self-hosted service can help connect your phone, but it does not store your chats or files.",
  "Mobile remote access is optional. It requires your own account and Signal services. The desktop app does not require an account.",
  "The computer must be on and running OpenBotFR for the phone to reach your agents.",
  "To remove a phone, open Settings, then Mobile Connect, on the computer and disconnect it. Its access stops at once.",
];
const PHONE_COMPUTER_QUESTION: LandingQuestion = {
  question: "Do I need a computer to use the mobile app?",
  answer:
    "Yes. The app controls the agents that run in OpenBotFR on your Mac, Windows or Linux computer. Your chats and files stay there.",
};
const PHONE_FREE_ANSWER =
  "Yes. OpenBotFR is free for noncommercial use under PolyForm Noncommercial 1.0.0. You pay your AI provider if its service has a fee.";

function providersQuestion(system: string): LandingQuestion {
  return {
    question: `Which AI agents can I run on ${system}?`,
    answer:
      PROVIDERS_ANSWER ??
      "Codex, Claude Code, Gemini, Grok and OpenCode, and any OpenAI-compatible endpoint, also one on your own computer.",
  };
}

export const DOWNLOAD_PAGES: Record<DownloadPagePlatform, DownloadPageContent> = {
  macos: {
    platform: "macos",
    name: "macOS",
    title: "Download OpenBotFR for Mac: AI agent app for macOS",
    description:
      "Get OpenBotFR for macOS 13 or later on Apple silicon or Intel. Review the fork's GitHub releases for available builds.",
    heading: "OpenBotFR for Mac",
    intro:
      "Run a team of AI agents on your Mac with the ChatGPT, Claude, Gemini or Grok plan you already pay for, or with your own model. Your chats and files stay on your Mac.",
    installers: [
      {
        label: "Download for Apple silicon",
        shortLabel: "Apple silicon",
        detail: "For a Mac with M1 or newer",
        href: OPENBOT_DOWNLOAD_LINKS.macos,
      },
      {
        label: "Download for Intel Mac",
        shortLabel: "Intel",
        detail: "For a Mac with an Intel processor",
        href: OPENBOT_ALTERNATE_DOWNLOAD_LINKS.macos,
      },
    ],
    specs: [
      { label: "System", value: "macOS 13 Ventura or later" },
      { label: "Processor", value: "Apple silicon or Intel" },
      { label: "File", value: "DMG, when published by the fork" },
      UPDATES_SPEC,
    ],
    installSteps: [
      {
        text: "Download the DMG for your Mac. To find which one you need, open the Apple menu and choose About This Mac: a “Chip” line means Apple silicon, a “Processor” line means Intel.",
      },
      { text: "Open the DMG and drag OpenBotFR to the Applications folder." },
      {
        text: "Open OpenBotFR from Applications. Check the publisher and signature of any downloaded build. Fork builds have no confirmed notarization status.",
      },
      CONNECT_STEP,
    ],
    extraSections: [],
    notes: [
      UPDATES_NOTE,
      NETWORK_NOTE,
      "Computer Use needs the Screen Recording and Accessibility permissions. macOS asks for them, and OpenBotFR does not go around the prompts.",
    ],
    faq: [
      { question: "Is OpenBotFR free on Mac?", answer: FREE_ANSWER },
      {
        question: "Does OpenBotFR run on an Intel Mac?",
        answer: "Yes. Download the Intel installer. It needs macOS 13 or later, like the Apple silicon one.",
      },
      providersQuestion("a Mac"),
    ],
    operatingSystem: "macOS 13 or later (Apple silicon or Intel)",
  },
  windows: {
    platform: "windows",
    name: "Windows",
    title: "Download OpenBotFR for Windows: AI agent app for Windows 10 and 11",
    description: "Get OpenBotFR for Windows 10 or 11 on x64. Review the fork's GitHub releases for available builds.",
    heading: "OpenBotFR for Windows",
    intro:
      "Run a team of AI agents on your PC with the ChatGPT, Claude, Gemini or Grok plan you already pay for, or with your own model. Your chats and files stay on your PC.",
    installers: [
      {
        label: "Download for Windows",
        shortLabel: "Windows x64",
        detail: "For a PC with a 64-bit Intel or AMD processor",
        href: OPENBOT_DOWNLOAD_LINKS.windows,
      },
    ],
    specs: [
      { label: "System", value: "Windows 10 or 11" },
      { label: "Processor", value: "x64, Intel or AMD" },
      { label: "File", value: "Installer (.exe)" },
      UPDATES_SPEC,
    ],
    installSteps: [
      { text: "Download the installer." },
      {
        text: "Before you run a downloaded installer, check that it came from the OpenBotFR GitHub release. Windows can warn about an unsigned or new build. Check the file before you decide to run it.",
      },
      {
        text: "The installer installs OpenBotFR for your user. Later, open OpenBotFR from the Start menu. No OpenBot account is needed.",
      },
      CONNECT_STEP,
    ],
    extraSections: [],
    notes: [
      UPDATES_NOTE,
      NETWORK_NOTE,
      "There is no build for Windows on Arm yet.",
      "If the release provides a checksum or build attestation, use it to check the installer before you run it.",
    ],
    faq: [
      { question: "Is OpenBotFR free on Windows?", answer: FREE_ANSWER },
      {
        question: "Why does Windows warn about the installer?",
        answer:
          "Fork releases may be unsigned, and Windows SmartScreen may warn about an unknown publisher. Review the release on the OpenBotFR GitHub page and check its files before you decide to run them.",
      },
      providersQuestion("Windows"),
    ],
    operatingSystem: "Windows 10 or later (x64)",
  },
  linux: {
    platform: "linux",
    name: "Linux",
    title: "Download OpenBotFR for Linux: AI agent app as an AppImage",
    description: "Get OpenBotFR for Linux as an AppImage for x64 or arm64, when a fork release is available.",
    heading: "OpenBotFR for Linux",
    intro:
      "Run a team of AI agents on your Linux computer with the ChatGPT, Claude, Gemini or Grok plan you already pay for, or with your own model. Your chats and files stay on your computer.",
    installers: [
      {
        label: "Download for Linux x64",
        shortLabel: "x64",
        detail: "When uname -m shows x86_64",
        href: OPENBOT_DOWNLOAD_LINKS.linux,
      },
      {
        label: "Download for Linux arm64",
        shortLabel: "arm64",
        detail: "When uname -m shows aarch64",
        href: OPENBOT_ALTERNATE_DOWNLOAD_LINKS.linux,
      },
    ],
    specs: [
      { label: "System", value: "Any 64-bit distribution" },
      { label: "Processor", value: "x64 or arm64" },
      { label: "File", value: "AppImage" },
      UPDATES_SPEC,
    ],
    installSteps: [
      {
        text: "Download the AppImage for your processor. To find which one you need, run this command: x86_64 means x64, and aarch64 means arm64.",
        code: "uname -m",
      },
      { text: "Make the downloaded AppImage executable.", code: "chmod +x OpenBotFR-*.AppImage" },
      {
        text: "Run it. For compatibility with installed releases, the app can still handle openbot:// links.",
        code: "./OpenBotFR-*.AppImage",
      },
      CONNECT_STEP,
    ],
    extraSections: [
      {
        title: "Ubuntu 23.10 or newer, and Debian 13",
        steps: [
          {
            text: "These distributions restrict the user namespaces that the Electron sandbox needs. If OpenBotFR exits during launch, take the legacy AppArmor profile out of the AppImage:",
            code: "./OpenBotFR-*.AppImage --appimage-extract resources/linux/openbot.apparmor",
          },
          {
            text: "Install the profile, then reload AppArmor:",
            code: "sudo install -m 0644 squashfs-root/resources/linux/openbot.apparmor /etc/apparmor.d/openbot\nsudo systemctl reload apparmor",
          },
          {
            text: "Check the path rules in the included legacy profile before installing it. Do not start OpenBotFR with --no-sandbox: the sandbox protects your computer from web content.",
          },
        ],
      },
      {
        title: "Optional remote access and self-hosting",
        steps: [
          {
            text: "OpenBotFR runs locally without a central account. For remote access, set up your own account API, Signal and TURN services. Follow the fork's self-hosting guide. The upstream server installer is not for OpenBotFR.",
          },
          { text: "Remote access is optional. The desktop app works without these services." },
        ],
      },
    ],
    notes: [
      "Check each OpenBotFR release for its supported Linux versions and architectures.",
      UPDATES_NOTE,
      NETWORK_NOTE,
      "Remote desktop works with the x64 AppImage in an X11 session, such as Xorg or Xvfb. It does not work under Wayland, and the arm64 AppImage does not include it.",
    ],
    faq: [
      {
        question: "Is there an AI agent app for Linux?",
        answer:
          "OpenBotFR supports Linux AppImages for x64 and arm64. Check the fork's GitHub releases for available builds.",
      },
      {
        question: "Why does OpenBotFR exit at once on Ubuntu?",
        answer:
          "Ubuntu 23.10 and newer, and Debian 13, restrict the user namespaces that the Electron sandbox needs. Install the AppArmor profile that ships in the AppImage, as the steps on this page show.",
      },
      {
        question: "Does OpenBotFR run on arm64 Linux?",
        answer: "Yes. Download the arm64 AppImage. It has the features of the x64 AppImage except remote desktop.",
      },
    ],
    operatingSystem: "Linux (x64 or arm64)",
  },
  ios: {
    platform: "ios",
    name: "iPhone",
    title: "OpenBotFR for iPhone: build the mobile client",
    description: "OpenBotFR for iPhone is available as source code. The fork has no published App Store app.",
    heading: "OpenBotFR for iPhone",
    intro: "Build the mobile client from the OpenBotFR source. Remote connection needs your own self-hosted services.",
    installers: [
      {
        label: "View mobile source on GitHub",
        shortLabel: "View source",
        detail: "No OpenBotFR App Store release is available",
        href: MOBILE_APPS.ios.href,
        external: true,
      },
    ],
    specs: [
      { label: "System", value: "iOS 16.4 or later" },
      { label: "Release", value: "Source only" },
      { label: "Needs", value: "OpenBotFR on a computer" },
      { label: "Remote", value: "Optional self-hosted services" },
    ],
    installSteps: [
      COMPUTER_STEP,
      {
        text: "Read the mobile build instructions in the OpenBotFR repository. No fork app is published in the App Store.",
      },
      GENERATE_CODE_STEP,
      {
        text: "In your own mobile build, choose Scan QR code and point the camera at the code. Both devices must use the same configured service.",
      },
    ],
    extraSections: [],
    notes: PHONE_NOTES,
    faq: [{ question: "Is OpenBotFR for iPhone free?", answer: PHONE_FREE_ANSWER }, PHONE_COMPUTER_QUESTION],
    operatingSystem: "iOS 16.4 or later",
  },
  android: {
    platform: "android",
    name: "Android",
    title: "OpenBotFR for Android: build the mobile client",
    description: "OpenBotFR for Android is available as source code. The fork has no published Google Play app.",
    heading: "OpenBotFR for Android",
    intro: "Build the mobile client from the OpenBotFR source. Remote connection needs your own self-hosted services.",
    installers: [
      {
        label: "View mobile source on GitHub",
        shortLabel: "View source",
        detail: "No OpenBotFR Google Play release is available",
        href: MOBILE_APPS.android.href,
        external: true,
      },
    ],
    specs: [
      { label: "System", value: "Android 7.0 or later" },
      { label: "Release", value: "Source only" },
      { label: "Needs", value: "OpenBotFR on a computer" },
      { label: "Remote", value: "Optional self-hosted services" },
    ],
    installSteps: [
      COMPUTER_STEP,
      {
        text: "Read the mobile build instructions in the OpenBotFR repository. No fork app is published on Google Play.",
      },
      GENERATE_CODE_STEP,
      {
        text: "In your own mobile build, choose Scan QR code and point the camera at the code. Both devices must use the same configured service.",
      },
    ],
    extraSections: [],
    notes: [
      ...PHONE_NOTES,
      "The app does not ask for access to all your photos and videos. You choose photos and files with the system picker.",
    ],
    faq: [{ question: "Is OpenBotFR for Android free?", answer: PHONE_FREE_ANSWER }, PHONE_COMPUTER_QUESTION],
    operatingSystem: "Android 7.0 or later",
  },
};

export const DOWNLOAD_HUB = {
  title: "Download OpenBotFR for Mac, Windows and Linux",
  description:
    "Find OpenBotFR fork releases for macOS, Windows and Linux, or build the app from source. Desktop use needs no central account.",
  heading: "Download OpenBotFR",
  intro:
    "Check the fork's GitHub releases for desktop installers. Mobile clients are source-only. Select your system for requirements and setup instructions.",
} as const;

export function downloadPagePath(platform: DownloadPagePlatform | "hub"): string {
  return OPENBOT_DOWNLOAD_PAGE_LINKS[platform];
}

export function downloadPageUrl(platform: DownloadPagePlatform | "hub", siteUrl: string = OPENBOT_SITE_URL): string {
  return new URL(downloadPagePath(platform), siteUrl).toString();
}

function breadcrumbData(platform: DownloadPagePlatform | "hub", siteUrl: string) {
  const trail = [
    { name: "OpenBotFR", url: siteUrl },
    { name: "Download", url: downloadPageUrl("hub", siteUrl) },
    ...(platform === "hub" ? [] : [{ name: DOWNLOAD_PAGES[platform].name, url: downloadPageUrl(platform, siteUrl) }]),
  ];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

function faqData(faq: readonly LandingQuestion[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: { "@type": "Answer", text: entry.answer },
    })),
  };
}

export function downloadPageHead(platform: DownloadPagePlatform | "hub", siteUrl: string) {
  const page = platform === "hub" ? undefined : DOWNLOAD_PAGES[platform];
  const title = page?.title ?? DOWNLOAD_HUB.title;
  const description = page?.description ?? DOWNLOAD_HUB.description;
  const url = downloadPageUrl(platform, siteUrl);
  const baseApplication = openBotSoftwareApplication(OPENBOT_SOFTWARE_APPLICATION_FACTS, siteUrl);
  const application = page
    ? {
        ...baseApplication,
        operatingSystem: page.operatingSystem,
        downloadUrl: page.installers.map((installer) => new URL(installer.href, siteUrl).toString()),
      }
    : baseApplication;

  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "OpenBotFR" },
      { property: "og:locale", content: "en_US" },
      { property: "og:url", content: url },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      ...openBotSocialImageMeta(siteUrl),
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: openBotSocialImageUrl(siteUrl) },
      { name: "twitter:image:alt", content: OPENBOT_SOCIAL_IMAGE_ALT },
      { "script:ld+json": application },
      { "script:ld+json": breadcrumbData(platform, siteUrl) },
      ...(page ? [{ "script:ld+json": faqData(page.faq) }] : []),
    ],
    links: [{ rel: "canonical", href: url }],
  };
}
