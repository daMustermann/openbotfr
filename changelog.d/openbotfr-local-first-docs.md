### Changed

- Build the OpenBotFR Windows x64 installer and unpacked application. Update the packaged app verifier
  for the OpenBotFR executable and Windows product metadata.
- Remove the link to the upstream Discord community from the desktop Help menu and sidebar.
- Explain the OpenBotFR local installer build, account-free desktop use,
  optional self-hosted remote setup, and Kilo Code ACP preset. Identify the
  legacy hosted service and telemetry limits, and remove claims about
  published OpenBotFR releases.
- Remove hosted-server purchase prompts from desktop and web interfaces.
  Keep controls for existing hosted servers.
- Require an explicit account API origin for mobile email sign-in, and keep
  mobile QR sessions bound to the service named in their code.
- Bundle provider version blocks locally and permit a remote HTTPS blocklist only by operator
  configuration. Update the macOS permission dialogs to say OpenBotFR.
- Remove upstream hosted origins from the desktop content security policy while keeping the
  configured self-hosted Signal origin.
- Keep the released installed profile directory when the product name changes to OpenBotFR.
- Point public download manifests, release fallback links, and source documentation links to the
  OpenBotFR fork and its own Windows x64 GitHub Release.
- Skip account network requests during startup when no session is saved.
- Describe fork desktop releases and mobile source-only status on public download pages.
  Remove upstream social, status, and hosted-service links from public navigation.
- Show OpenBotFR in translated desktop, mobile, and error text. Preserve released error text on the wire.
