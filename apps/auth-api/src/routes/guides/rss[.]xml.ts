import { createFileRoute } from "@tanstack/solid-router";
import { GUIDES_COLLECTION } from "../../lib/guides";
import { contentRssResponse } from "../../server/content-feed";

export const Route = createFileRoute("/guides/rss.xml")({
  server: { handlers: { GET: ({ request }) => contentRssResponse(GUIDES_COLLECTION, request) } },
});
