// Keep old brand links working without offering upstream wordmark files as fork assets.
import { createFileRoute, redirect } from "@tanstack/solid-router";

export const Route = createFileRoute("/brand/")({
  beforeLoad: () => {
    throw redirect({ to: "/", statusCode: 302 });
  },
});
