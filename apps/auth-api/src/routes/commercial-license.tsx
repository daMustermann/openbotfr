// The upstream paid seat contract does not apply to this fork.
import { createFileRoute, redirect } from "@tanstack/solid-router";

export const Route = createFileRoute("/commercial-license")({
  beforeLoad: () => {
    throw redirect({ href: "https://github.com/daMustermann/openbotfr/issues", statusCode: 302 });
  },
});
