// The upstream contact form sends to an address that the fork does not own.
import { createFileRoute, redirect } from "@tanstack/solid-router";

export const Route = createFileRoute("/contact")({
  beforeLoad: () => {
    throw redirect({ href: "https://github.com/daMustermann/openbotfr/issues", statusCode: 302 });
  },
});
