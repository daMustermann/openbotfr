import type { MobilePlatformLogoVariant } from "@openbot/brand";
import type { PlatformNavigator } from "./download-platforms";

export type MobilePlatform = MobilePlatformLogoVariant;

export interface MobileAppDetails {
  action: string;
  description: string;
  href: string;
  id: MobilePlatform;
  label: string;
  status: "Source only";
}

/** The fork does not publish mobile store packages. Link to its mobile source. */
const MOBILE_SOURCE_URL = "https://github.com/daMustermann/openbotfr/tree/main/apps/mobile";
export const MOBILE_APPS: Record<MobilePlatform, MobileAppDetails> = {
  ios: {
    id: "ios",
    label: "iPhone",
    status: "Source only",
    description: "Build from source · Optional self-hosted remote access",
    action: "View iPhone source",
    href: MOBILE_SOURCE_URL,
  },
  android: {
    id: "android",
    label: "Android",
    status: "Source only",
    description: "Build from source · Optional self-hosted remote access",
    action: "View Android source",
    href: MOBILE_SOURCE_URL,
  },
};

export const MOBILE_APP_ORDER: readonly MobilePlatform[] = ["ios", "android"];

/**
 * The phone app for a visitor on a phone. Android reports Linux and an iPhone reports "like Mac OS X",
 * so check this before the desktop detection. An iPad in desktop mode reports a Mac and stays one.
 */
export function detectMobilePlatform(source: PlatformNavigator): MobilePlatform | undefined {
  const platform =
    `${source.userAgentData?.platform ?? ""} ${source.platform ?? ""} ${source.userAgent ?? ""}`.toLowerCase();

  if (/iphone|ipad|ipod/.test(platform)) return "ios";
  if (/android/.test(platform)) return "android";
  return undefined;
}
