import { HOSTED_SERVER_ENTRY_POINTS } from "@openbot/contracts/hosted-servers";
import { isOneOf } from "@openbot/contracts/runtime-values";
import { Effect, Schema } from "effect";
import {
  ACCOUNT_ANALYTICS_SCHEMA_VERSION,
  BILLING_PRODUCTS,
  FIRST_TOUCH_PROPERTIES,
  isAnalyticsLicenseUsers,
  PLAN_CHANGE_DIRECTIONS,
} from "./account-analytics";

const PROFILE_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/u;
const SOURCE_KEY_PATTERN = /^[A-Za-z0-9_.:-]{1,512}$/u;
const SAFE_VALUE_PATTERN = /^[A-Za-z0-9_.:/+-]{1,128}$/u;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;

const BILLING_ACTIONS = [
  "checkout_started",
  "checkout_returned",
  "checkout_expired",
  "plan_started",
  "payment_succeeded",
  "payment_failed",
  "payment_recovered",
  "payment_refunded",
  "refund_failed",
  "payment_disputed",
  "dispute_lost",
  "plan_changed",
  "cancel_scheduled",
  "cancel_withdrawn",
  "plan_ended",
  "portal_opened",
  "server_ready",
  "server_setup_failed",
] as const;
const BILLING_PLANS = ["starter", "standard", "pro"] as const;
const BILLING_INTERVALS = ["month", "year"] as const;
const BILLING_CURRENCIES = ["eur", "usd", "pln"] as const;
const BILLING_PAYMENT_KINDS = ["first_purchase", "renewal", "adjustment"] as const;
const BILLING_RECOVERY_KINDS = ["invoice", "checkout", "invoice_recovery", "checkout_recovery", "none"] as const;
const BILLING_FLOWS = ["manage", "update", "cancel"] as const;
const BILLING_SUBSCRIPTION_STATUSES = [
  "active",
  "past_due",
  "canceled",
  "unpaid",
  "trialing",
  "incomplete",
  "incomplete_expired",
  "paused",
] as const;

const SALES_ANALYTICS_EVENT_NAMES = ["billing_action", "revenue", "billing_snapshot"] as const;
type SalesAnalyticsEventName = (typeof SALES_ANALYTICS_EVENT_NAMES)[number];

/** The only event properties that the account Worker may send to OpenPanel. */
const SALES_ANALYTICS_EVENT_PROPERTIES = {
  billing_action: [
    "action",
    "product",
    "plan",
    "users",
    "direction",
    "entry_point",
    "interval",
    "currency",
    "amount",
    "original_amount",
    "amount_usd",
    "fx_rate",
    "fx_date",
    "flow",
    "checkout_status",
    "failure_reason",
    "recovery",
    "subscription_status",
    "server_status",
    ...FIRST_TOUCH_PROPERTIES,
  ],
  revenue: [
    "__revenue",
    "amount_usd",
    "original_amount",
    "currency",
    "original_currency",
    "fx_rate",
    "fx_date",
    "product",
    "plan",
    "users",
    "interval",
    "payment_kind",
    "recovery",
    ...FIRST_TOUCH_PROPERTIES,
  ],
  billing_snapshot: [
    "snapshot_date",
    "as_of",
    "reported_at",
    "currency",
    "mrr",
    "arr",
    "overdue_mrr",
    "paying_accounts",
    "paid_servers",
    "cancellations_scheduled",
    "checkout_mature_accounts",
    "checkout_converted_accounts",
    "checkout_pending_accounts",
    "skipped_subscriptions",
    "license_mrr",
    "license_accounts",
    "licensed_users",
    "total_mrr",
    "total_arr",
  ],
} as const satisfies Record<SalesAnalyticsEventName, readonly string[]>;

export type SalesAnalyticsProperties = Record<string, string | number>;

export interface SalesAnalyticsDrainSummary {
  claimed: number;
  sent: number;
  rejected: number;
  uncertain: number;
  pending: number;
}

export class SalesAnalyticsDeliveryError extends Schema.TaggedError<SalesAnalyticsDeliveryError>()(
  "SalesAnalyticsDeliveryError",
  {
    code: Schema.Literals(["invalid_event", "database", "delivery"]),
  },
) {}

export interface SalesAnalyticsDeliveryOptions {
  database: D1Database;
  clientId: string | undefined;
  clientSecret: string | undefined;
  fetch: (input: string, init: RequestInit) => Promise<Response>;
  now?: () => number;
}

/**
 * Preserves the existing sales-event ledger without outbound telemetry.
 * Source keys and stored events remain available for backward compatibility.
 */
export class SalesAnalyticsDelivery {
  readonly #database: D1Database;
  readonly #now: () => number;

  constructor(options: SalesAnalyticsDeliveryOptions) {
    this.#database = options.database;
    this.#now = options.now ?? Date.now;
  }

  enqueue(
    sourceKey: string,
    profileId: string | null,
    name: string,
    properties: SalesAnalyticsProperties,
    timestamp: number,
  ): Effect.Effect<void, SalesAnalyticsDeliveryError> {
    return Effect.tryPromise({
      try: async () => {
        const event = validateEvent(sourceKey, profileId, name, properties, timestamp);
        const now = this.#now();
        await this.#database
          .prepare(
            `INSERT OR IGNORE INTO billing_analytics_events(
               source_key, profile_id, event_name, properties_json, event_timestamp, status, attempts,
               next_attempt_at, claimed_at, claim_token, last_status, last_error, created_at, updated_at
             ) VALUES (?, ?, ?, ?, ?, 'pending', 0, 0, NULL, NULL, NULL, NULL, ?, ?)`,
          )
          .bind(sourceKey, profileId, event.name, JSON.stringify(event.properties), timestamp, now, now)
          .run();
      },
      catch: (error) =>
        error instanceof SalesAnalyticsDeliveryError ? error : new SalesAnalyticsDeliveryError({ code: "database" }),
    });
  }

  /** Keep existing ledger records. Do not send analytics or change delivery state. */
  drain(): Effect.Effect<SalesAnalyticsDrainSummary, SalesAnalyticsDeliveryError> {
    return Effect.tryPromise({
      try: async () => {
        const row = await this.#database
          .prepare("SELECT COUNT(*) AS pending FROM billing_analytics_events WHERE status IN ('pending', 'rejected')")
          .first<{ pending: number }>();
        return { claimed: 0, sent: 0, rejected: 0, uncertain: 0, pending: row?.pending ?? 0 };
      },
      catch: () => new SalesAnalyticsDeliveryError({ code: "database" }),
    });
  }
}

interface ValidatedEvent {
  name: SalesAnalyticsEventName;
  properties: SalesAnalyticsProperties;
}

function validateEvent(
  sourceKey: string,
  profileId: string | null,
  name: string,
  properties: SalesAnalyticsProperties,
  timestamp: number,
): ValidatedEvent {
  if (!SOURCE_KEY_PATTERN.test(sourceKey) || (profileId !== null && !PROFILE_ID_PATTERN.test(profileId))) {
    throw new SalesAnalyticsDeliveryError({ code: "invalid_event" });
  }
  if (!isOneOf(SALES_ANALYTICS_EVENT_NAMES, name)) {
    throw new SalesAnalyticsDeliveryError({ code: "invalid_event" });
  }
  if (!Number.isSafeInteger(timestamp) || timestamp < 0 || !Number.isFinite(new Date(timestamp).getTime())) {
    throw new SalesAnalyticsDeliveryError({ code: "invalid_event" });
  }
  if (!isEventProperties(properties)) throw new SalesAnalyticsDeliveryError({ code: "invalid_event" });
  const allowed = SALES_ANALYTICS_EVENT_PROPERTIES[name];
  for (const key of Object.keys(properties)) {
    if (!allowed.some((candidate) => candidate === key)) {
      throw new SalesAnalyticsDeliveryError({ code: "invalid_event" });
    }
  }
  const output: SalesAnalyticsProperties = {
    surface: "account_api",
    environment: "production",
    event_schema_version: ACCOUNT_ANALYTICS_SCHEMA_VERSION,
    ...properties,
  };
  if (name === "billing_action" && typeof output.action !== "string") {
    throw new SalesAnalyticsDeliveryError({ code: "invalid_event" });
  }
  const revenue = output.__revenue;
  if (name === "revenue" && (typeof revenue !== "number" || !Number.isSafeInteger(revenue) || revenue < 0)) {
    throw new SalesAnalyticsDeliveryError({ code: "invalid_event" });
  }
  if (!eventPropertyValuesAreValid(output)) throw new SalesAnalyticsDeliveryError({ code: "invalid_event" });
  return { name, properties: output };
}

function eventPropertyValuesAreValid(properties: SalesAnalyticsProperties): boolean {
  for (const [key, value] of Object.entries(properties)) {
    if (typeof value === "number") {
      if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER) return false;
      if (
        [
          "__revenue",
          "amount",
          "original_amount",
          "amount_usd",
          "mrr",
          "arr",
          "overdue_mrr",
          "paying_accounts",
          "paid_servers",
          "cancellations_scheduled",
          "checkout_mature_accounts",
          "checkout_converted_accounts",
          "checkout_pending_accounts",
          "skipped_subscriptions",
          "license_mrr",
          "license_accounts",
          "licensed_users",
          "total_mrr",
          "total_arr",
          "as_of",
          "reported_at",
        ].includes(key)
      ) {
        if (!Number.isSafeInteger(value) || value < 0) return false;
      }
      if (["fx_rate"].includes(key) && value <= 0) return false;
      if (key === "users" && !isAnalyticsLicenseUsers(value)) return false;
      continue;
    }
    if (key === "users") return false;
    if (key === "product" && !isOneOf(BILLING_PRODUCTS, value)) return false;
    if (key === "direction" && !isOneOf(PLAN_CHANGE_DIRECTIONS, value)) return false;
    if (key === "entry_point" && !isOneOf(HOSTED_SERVER_ENTRY_POINTS, value)) return false;
    if (key === "action" && !isOneOf(BILLING_ACTIONS, value)) return false;
    if (key === "plan" && !isOneOf(BILLING_PLANS, value)) return false;
    if (key === "interval" && !isOneOf(BILLING_INTERVALS, value)) return false;
    if (["currency", "original_currency"].includes(key) && !isOneOf(BILLING_CURRENCIES, value)) return false;
    if (key === "payment_kind" && !isOneOf(BILLING_PAYMENT_KINDS, value)) return false;
    if (key === "recovery" && !isOneOf(BILLING_RECOVERY_KINDS, value)) return false;
    if (key === "flow" && !isOneOf(BILLING_FLOWS, value)) return false;
    if (key === "subscription_status" && !isOneOf(BILLING_SUBSCRIPTION_STATUSES, value)) return false;
    if (["fx_date", "snapshot_date"].includes(key) && !DATE_PATTERN.test(value)) return false;
  }
  return true;
}

function isEventProperties(value: unknown): value is SalesAnalyticsProperties {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  for (const [key, item] of Object.entries(value)) {
    if (key === "__timestamp") return false;
    if (typeof item === "number") {
      if (!Number.isFinite(item) || Math.abs(item) > Number.MAX_SAFE_INTEGER) return false;
    } else if (typeof item === "string") {
      if (item.length > 256) return false;
      if (!SAFE_VALUE_PATTERN.test(item)) return false;
    } else {
      return false;
    }
  }
  return true;
}
