# Privacy in OpenBotFR

OpenBotFR (OpenBot For Real) is intended for local desktop use without a hosted
OpenBot account and without product telemetry. This document describes the code
in this fork on 28 October 2026. It also identifies work that is not complete.

## Local data

The desktop stores agents, conversations, queues, attachments, and provider session
references in its local SQLite database (`openbot.db`) and local workspace folders.
Browser data stays in the browser profile of the computer that runs the app.
The database is the source of truth. No account service is needed to work with a
local agent. Uninstalling the app can leave the profile and workspace data in place.
The installed OpenBotFR app keeps the released `OpenBot` profile directory so
an upgrade can read existing data without moving the database.
Review the data paths in [README.md](README.md#local-data-and-network-boundaries)
before you remove a profile.

Agents have broad local file and command access. The present agent execution mode
uses `danger-full-access` and `approvalPolicy: never` after first-launch consent.
Use trusted agents and keep a separate backup of important files. Local storage
does not prevent an agent from sending data through its own tools.

## Desktop telemetry

The current desktop renderer disables product analytics in
`src/renderer/src/analytics.ts`: desktop configuration rejects the analytics
client and the web configuration path disables it. The desktop error-report
transport is disabled in `src/renderer/src/error-reports.ts`.
`src/main/application-services.ts` sets host analytics to `enabled: false`.
These changes stop the named desktop product analytics and automatic error-report
paths. Old analytics code and endpoint strings remain in the source, but the
desktop CSP rejects the upstream analytics endpoint. This is not a complete
verification of all network traffic.

Do not treat the upstream privacy statement or analytics settings as proof of
zero network traffic for every build. Do not send diagnostics or other exports
without checking their contents. Local logging and local inventory data can
still exist without being transmitted to an analytics server.

## Services that can use the network

### Vault API keys and local machine metrics

The Vault can store API keys through the operating system's secret storage.
When an agent lists its keys, OpenBotFR writes the Vault keys to files under
`agent-api-keys/.vault` in the local profile, outside agent workspaces. Every
agent on that computer can read those files with its command tools. Changes
and deletions in the Vault update these files. Keys are redacted from logs,
exports, and diagnostics.

An authorized server administrator can list Vault item names over the encrypted
Team connection. The list does not contain secret values. Showing or copying
a key sends that value to the authorized client. A CSV import sends its selected
contents to the host for local storage; it does not send them to the account
service.

Machine monitoring reads local disk, memory, and CPU use. Authorized server
administrators can read these measurements and manage alerts through the
encrypted Team connection. These measurements do not enable product telemetry.

### Providers and connected services

OpenBotFR is not an offline-only app. Codex, Claude, Grok, Gemini, Cursor, Cline,
OpenCode, and other providers can send prompts, context, attached content, and
tool results to their selected service. Local model endpoints can avoid a cloud
model provider, but a configured plugin or tool can still use the network.
A provider switch can send a bounded excerpt of the local conversation to the
new provider to continue the task. The provider's own storage and privacy terms
apply. Provider authentication is separate from an OpenBot account.

Web pages loaded in the embedded browser contact their sites. Downloaded
provider runtimes, optional native drivers, updates, skills, plugins, marketplace
links, webhooks, and connected tools can also contact other services. Content
sent by an agent or browser action follows the configured destination.

## Accounts and remote connections

A local desktop session does not require paid hosted registration. The current
code retains the upstream account Worker in `apps/auth-api` and remote Signal
service in `remote/api`. A remote Team connection still requires account
identity, invitations or membership, signed tickets, Signal, and WebRTC.
The configured account service can store account profiles, host configuration,
memberships, invitations, and logical sessions. Workspaces, conversations,
files, and commands remain on the host. WebRTC can use direct connections or
TURN relay transport. A relay can see connection metadata, but the Team data
is carried in encrypted WebRTC channels.

The desktop account API defaults to `http://127.0.0.1:3100` when
`OPENBOT_AUTH_API_URL` is unset. Remote access requires explicit service
configuration; do not assume that the local fallback is reachable from another
computer. See [Self-hosted remote access](docs/self-hosting.md).

The mobile product analytics client in
`apps/mobile/src/features/analytics/mobile-analytics.ts` is disabled, and its
failure-report queue creates no network transport. The public website's
landing-page analytics gate in `apps/auth-api/src/lib/analytics.ts` returns
`false`. The account Worker disables account analytics and sales analytics
delivery. The production deploy script does not require OpenPanel credentials.
Existing billing records remain in D1. The full set of network paths still
needs independent verification before a release.

The remaining hosted billing, signup, and server provisioning source is legacy
upstream code. OpenBotFR does not offer a paid hosted server as part of the
local installer. The presence of that source is not evidence of an OpenBotFR
commercial service.

## Release and update checks

The host upstream release check is off by default. The compatibility switch
`OPENBOTFR_USE_UPSTREAM_RELEASES=1` can contact upstream GitHub Releases.
Such a request exposes connection metadata, including the IP address, to GitHub.
Upstream release results are not OpenBotFR installers or updates. Provider CLI update checks
contact the providers' release sources. The provider version blocklist is bundled and causes no
request to the upstream OpenBot repository. An operator can set
`OPENBOTFR_RUNTIME_BLOCKLIST_URL` to an HTTPS endpoint to fetch an optional remote blocklist.

## Secrets and data sharing

Provider credentials, session tokens, browser cookies, and self-hosted signing
keys can grant access to accounts or files. Do not put them in bug reports,
logs, public screenshots, or shared exports. The application has redaction
rules, but review each export before you send it. Keep self-hosted keys in an
access-controlled secret store; do not commit them to the repository.

The application includes import, export, team sharing, attachment transfers,
and browser downloads. These actions can put content outside its original
workspace when a user or agent initiates them. Remote clients receive host data
only through their established access permissions and encrypted connection.

## Current scope

This document covers current fork changes checked in the desktop code and
identifies remaining legacy implementations. It is not a verification report
for the mobile app, the public site, or a deployed self-hosted Worker. The
fork has not yet demonstrated that **all** products and services send no
telemetry. A separate runtime and network audit is required for that claim.

OpenBotFR retains the [PolyForm Noncommercial License 1.0.0](LICENSE).
