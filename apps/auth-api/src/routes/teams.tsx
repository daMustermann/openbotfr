import { createFileRoute, redirect } from "@tanstack/solid-router";

// Older managed hosting links lead to the local-first home page.
export const Route = createFileRoute("/teams")({
  beforeLoad: () => {
    throw redirect({ to: "/", statusCode: 308 });
  },
});
