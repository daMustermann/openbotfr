import { createFileRoute } from "@tanstack/solid-router";
import { LandingPage } from "../components/landing/LandingPage";
import { openBotHomeHead } from "../lib/site-metadata";
import { OPENBOT_SOFTWARE_APPLICATION_FACTS } from "../lib/software-application";

export const Route = createFileRoute("/")({
  head: ({ match }) => openBotHomeHead(OPENBOT_SOFTWARE_APPLICATION_FACTS, match.context.siteUrl),
  component: LandingPage,
});
