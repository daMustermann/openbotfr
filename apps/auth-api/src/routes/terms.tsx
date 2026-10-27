// Link to the fork license instead of upstream managed-service terms.
import { createFileRoute, redirect } from "@tanstack/solid-router";

export const Route = createFileRoute("/terms")({
  beforeLoad: () => {
    throw redirect({ href: "https://github.com/daMustermann/openbotfr/blob/main/LICENSE", statusCode: 302 });
  },
});
