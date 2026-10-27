import { AppLogo } from "@openbot/brand";
import { isDynamicRecord, isOneOf } from "@openbot/contracts/runtime-values";
import { createFileRoute } from "@tanstack/solid-router";
import { onSettled, Show } from "solid-js";
import { billingReturnText } from "../../components/transactional/page-text";
import { TransactionalPage } from "../../components/transactional/TransactionalPage";
import { BILLING_RETURN_KINDS, type BillingReturnKind, landingAnalytics } from "../../lib/analytics";
import { loadPageText } from "../../lib/page-text";

/** The page that Stripe Checkout and the Customer Portal open when a desktop user goes back. */
export const Route = createFileRoute("/billing/return")({
  headers: () => ({
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
  }),
  // A cancelled Checkout comes back with `cancelled=1`, and the router reads a number from the query.
  // The router also validates the search that it wrote, so `true` must stay true. A page that was
  // not cancelled keeps the key out of its URL. `kind` names the Stripe page that closed; an older
  // account service sends no `kind`, and an unknown value is dropped.
  validateSearch: (value): { cancelled?: true; kind?: BillingReturnKind } => {
    if (!isDynamicRecord(value)) return {};
    const cancelled = value.cancelled === 1 || value.cancelled === "1" || value.cancelled === true;
    return {
      ...(cancelled ? { cancelled: true } : {}),
      ...(isOneOf(BILLING_RETURN_KINDS, value.kind) ? { kind: value.kind } : {}),
    };
  },
  loader: ({ context }) => loadPageText(context.locale, billingReturnText),
  head: ({ loaderData }) => ({
    meta: [
      ...(loaderData ? [{ title: loaderData.text.pageTitle }] : []),
      { name: "robots", content: "noindex, nofollow, noarchive" },
    ],
  }),
  component: BillingReturn,
});

/** Remove the Checkout Session ID from the browser URL after the return. */
function clearCheckoutSessionFromUrl(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("checkout")) return;
  url.searchParams.delete("checkout");
  window.history.replaceState(window.history.state, "", url);
}

function BillingReturn() {
  const search = Route.useSearch();
  const page = Route.useLoaderData();
  const text = () => page().text;
  onSettled(() => {
    clearCheckoutSessionFromUrl();
    return landingAnalytics.startBillingReturn(document, window.location.hostname, {
      cancelled: search().cancelled === true,
      kind: search().kind,
    });
  });
  return (
    <TransactionalPage titleId="billing-return-title" lang={page().lang}>
      <AppLogo variant="production" class="join-card-logo" />
      <Show
        when={search().cancelled}
        fallback={
          <>
            <h1 id="billing-return-title">{text().updatedTitle}</h1>
            <p class="join-card-copy">{text().updatedBody}</p>
          </>
        }
      >
        <h1 id="billing-return-title">{text().cancelledTitle}</h1>
        <p class="join-card-copy">{text().cancelledBody}</p>
      </Show>
    </TransactionalPage>
  );
}
