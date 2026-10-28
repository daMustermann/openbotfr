# OpenBotFR 0.52.1

Windows x64 release with 46 newer upstream commits and the existing OpenBotFR changes.

- Preserve the OpenBotFR name, local desktop use without an account, and optional self-hosting.
- Keep desktop product telemetry and automatic desktop error reports disabled in reviewed paths. Network access remains possible for AI providers, plugins, browser activity, downloads, and optional remote services. No complete network capture was performed.
- Fix local conversation read and server settings save operations when signed out.
- Retain the existing Windows app identity and profile path for upgrades.
- Add storage compatibility safeguards for API keys, drafts, and workflow pins. Existing database rows stay intact during migration checks.
- Include upstream workflow, vault, UI, and agent improvements.

## Checks and limits

Windows NSIS build and packaged app verification passed. All 61 focused migration tests and 11 storage downgrade checks passed, as did Node/renderer type checks and commit hooks. A real update of an existing installed profile has not been tested. The Windows installer is unsigned, and SmartScreen may warn. Automatic app updates remain disabled. Installer must be run manually.

This release contains a Windows x64 installer and an unpacked ZIP. Check their SHA-256 values in `SHA256SUMS.txt`.

License: PolyForm Noncommercial 1.0.0.
