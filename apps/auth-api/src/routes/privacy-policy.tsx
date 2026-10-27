// The upstream legal policy names an operator unrelated to this fork.
import { createFileRoute, redirect } from "@tanstack/solid-router";

export const Route = createFileRoute("/privacy-policy")({
  beforeLoad: () => {
    throw redirect({ href: "https://github.com/daMustermann/openbotfr/blob/main/PRIVACY.md", statusCode: 302 });
  },
});
