import type { AppInfo, CentralAuthUser } from "@openbot/contracts/ipc";
import type { FailureProperties } from "@openbot/telemetry";
import { ANALYTICS_GENERATIONS } from "@openbot/telemetry";

// The schema stays for compatibility with existing local settings and consumers.
export const ANALYTICS_SCHEMA_VERSION = ANALYTICS_GENERATIONS.desktop;
export const WEB_PREFERENCE = "openbot:web:error-reports-enabled";

// OpenBotFR sends no product analytics or error reports from any surface.
export function configureDesktopReports(
  _info: AppInfo,
  _tracking: boolean,
  _user: Pick<CentralAuthUser, "id" | "email"> | null,
): void {}

export function configureErrorReports(_tracking: boolean, _accountId: string | null = null): void {}

export function webReportsEnabled(): boolean {
  return false;
}

export function configureWebReports(_user: Pick<CentralAuthUser, "id" | "email"> | null): void {}

export function setWebReportsEnabled(_value: boolean): boolean {
  return false;
}

export function reportNotification(_properties: FailureProperties): void {}

export function reportErrorBanner(_error: unknown, _operation: FailureProperties["operation"] = "other"): void {}
