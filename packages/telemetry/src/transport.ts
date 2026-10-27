import { Effect } from "effect";
import type { ReportTransport } from "./queue";

export function openPanelTransport(_options: {
  clientId: string;
  clientSecret?: string;
  origin?: string;
  endpoint?: string;
  fetch?: typeof fetch;
}): ReportTransport {
  // Drain old report queues without sending reports to a vendor or test server.
  return () => Effect.succeed(true);
}
