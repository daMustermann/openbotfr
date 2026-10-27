import { AppLogo } from "@openbot/brand";
import { Link } from "@tanstack/solid-router";

/** The site header links to the fork. Legacy OpenBot wordmark exports are not offered. */
export function SiteLogoLink() {
  return (
    <Link class="landing-brand" to="/" aria-label="OpenBotFR home">
      <AppLogo variant="production" class="landing-brand-logo" />
      <span>OpenBotFR</span>
    </Link>
  );
}
