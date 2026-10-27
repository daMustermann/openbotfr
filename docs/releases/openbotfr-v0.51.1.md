# OpenBotFR 0.51.1: Privacy-first Windows release

**OpenBotFR means OpenBot For Real.** This fork puts local control first. This is the first
OpenBotFR binary release for **Windows x64**. It includes an NSIS installer and a ZIP of the
unpacked application.

## Privacy and local control

- **No OpenBot account required.** Open the Windows app and use local agents and workspaces
  without registering for a hosted OpenBot account.
- **Desktop product telemetry disabled.** The Windows build disables the known product usage
  analytics and automatic desktop error-report transports. The desktop content security policy
  also removes the upstream analytics origin. This is a statement about the reviewed code paths,
  not a claim that every outbound network request was captured.
- **Local data remains local by default.** Agent state, workspaces, conversations, queues,
  attachments, and browser data are held on the computer that runs the app. The SQLite database
  remains the source of truth.
- **Cloud hosting is optional.** Hosted OpenBot cloud purchase and signup prompts are removed
  from the Windows flow. If you need remote Team access, you can configure and host your own
  account and Signal services. Remote access still requires their account and invitation system.
- **No forced upstream updates.** Automatic app updates are disabled so the fork does not
  replace itself with an upstream OpenBot installer. Provider CLI downloads and their own release
  checks remain available. A remote provider blocklist is opt-in.

OpenBotFR is **not an offline-only application**. AI providers can receive prompts and context;
plugins and agents can access the network; browser tabs contact visited websites; and optional
remote services and downloads contact their configured endpoints. Read the full
[privacy policy](../../PRIVACY.md) for these limits.

## Windows improvements

- Rebrand the Windows product, executable, installer, and desktop UI to **OpenBotFR**.
- Add a **Kilo Code ACP** provider preset that calls `kilo acp`. Install Kilo Code CLI separately.
- Keep the existing `OpenBot` installed profile path, `appId`, and protocol for upgrade
  compatibility. This release does not migrate or reset the existing user database.
- Remove the upstream Discord link and upstream hosted-service links from desktop entry points.

## Download

| File | Purpose |
| --- | --- |
| [OpenBotFR-0.51.1-x64.exe](https://github.com/daMustermann/openbotfr/releases/download/openbotfr-v0.51.1/OpenBotFR-0.51.1-x64.exe) | Windows x64 NSIS installer |
| [OpenBotFR-0.51.1-win-x64-unpacked.zip](https://github.com/daMustermann/openbotfr/releases/download/openbotfr-v0.51.1/OpenBotFR-0.51.1-win-x64-unpacked.zip) | Windows x64 unpacked application |
| [SHA256SUMS.txt](https://github.com/daMustermann/openbotfr/releases/download/openbotfr-v0.51.1/SHA256SUMS.txt) | SHA-256 checksum list |

SHA-256 checksums:

```text
bf485bb97461e70f50ead45ebf10b49d8ddf7325e5ae4069849104a9fa2b3aac  OpenBotFR-0.51.1-x64.exe
dcceae579eeffc5723946854d9b8200f9ded8219e5955c3fd5de21cdb619f7d2  OpenBotFR-0.51.1-win-x64-unpacked.zip
```

## Validation and limitations

The Windows x64 package build succeeded. Package verification checked the executable and
resources, Electron security fuses, startup, and a second-instance launch using a separate
test profile. Focused branding, locale, provider, and fork download checks passed.

**The Windows files are unsigned.** Windows SmartScreen may show a warning. A full clean install,
an upgrade from an existing OpenBot installation, a real Kilo Code ACP session, and an outbound
network capture have **not** been verified. Automatic application updates are disabled. Other
platforms are outside this binary release. Do not use upstream installers as OpenBotFR installers.

The project retains the [PolyForm Noncommercial 1.0.0 license](../../LICENSE).
