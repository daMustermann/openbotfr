### Changed

- Merge upstream OpenBot changes through `2357441bb`, including provider and Vault improvements, side-thread attachments and drafts, machine monitoring, and Dutch translations.
- Keep OpenBotFR local access, branding, disabled telemetry, optional self-hosting, and Kilo Code integration.
- Enable Windows in-app update checks from the OpenBotFR GitHub release feed.

### Fixed

- Keep new saved data separate from records that older builds can replace.
- Check new foreign-key violations during upgrades without deleting older broken references.
- Protect shared provider runtime files when another app instance uses them.
- Keep Codex local bridge WebSocket retry and orphan tool-output diagnostics in logs without repeated desktop error notices.
