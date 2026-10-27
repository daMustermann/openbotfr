# Optional self-hosted remote access

OpenBotFR is a local desktop application first. You do not need a central
account service, Cloudflare, Signal, or TURN to use agents on one computer.
Use this guide only if you need remote Team connections to another computer.

## Current limits

The remote connection code is inherited from upstream OpenBot. It still needs
an account service to issue signed connection tickets. The account Worker
stores accounts and access permissions; Signal sets up WebRTC connections,
and TURN relays them when direct connections fail. The account Worker does not
store conversations or workspace files. A self-hosted setup still has **local
accounts** and email-code sign-in for remote membership. Account-free remote
Team access is not yet implemented.

The current code supports `OPENBOT_AUTH_API_URL` and
`OPENBOT_REMOTE_SIGNAL_URL` for the desktop. This is a configuration path,
not proof that all remote features have passed an end-to-end test in this
fork. The desktop account API fallback is `http://127.0.0.1:3100`.

**Telemetry:** The public analytics gate and account analytics transport are
disabled. Sales analytics delivery is disabled and OpenPanel credentials are
not needed to deploy the Worker. Existing billing records remain in D1.
Full remote-service network verification is still required before a release.

## Local use

1. Build the desktop app from this checkout. See [Install](../README.md#install).
2. Start the desktop app and configure a provider or a local model server.
3. Keep the local database and workspaces on the machine that runs agents.
   No hosted account registration is part of this flow.

For development, `bun run dev` starts the local Auth API, Signal, and desktop
app. Use the ports reported by the dev runner. This development stack is
not a production remote-access service. It can help validate the local
account and remote paths before you deploy them.

## Remote access architecture

```text
Remote client
    |  account sign-in and ticket request
    v
Your account API (HTTPS) -- accounts, memberships, sessions
    |  signed ticket and public keys
    v
Your Signal (WSS) -- WebRTC setup messages
    |  direct peer connection or your TURN relay
    v
Your OpenBotFR host -- local SQLite, agents, files, commands
```

The current remote protocol expects the desktop clients and the host to
use the same account and Signal services. A ticket signed for one service
must not be accepted by a separate service with different access rules.
Use a separate key pair for your installation. Invitation links still use
the `openbot://join` protocol.

To prepare an independent remote service, you need:

- A dedicated domain with HTTPS for the account API and WSS for Signal.
- A Cloudflare Worker with D1 and R2 for the current account API code.
- A Linux host for Signal and coturn, with publicly reachable ports and a
  TLS certificate. See [remote requirements](../remote/README.md#production-requirements).
- SMTP credentials to send one-time remote sign-in codes.
- `SELF_HOSTED_PUBLIC_ORIGIN=https://api.example.com` in the account Worker
  settings. Set it to the same HTTPS origin that desktop and mobile use for
  `OPENBOT_AUTH_API_URL` and `EXPO_PUBLIC_OPENBOT_API_URL`. Do not include a
  path, a query, or credentials. The Worker checks this setting before it
  emails `openbot://join` invitations. Without it, self-hosted invitation
  email is rejected and the client revokes the unused invitation.
- Separate ES256 ticket signing keys and the matching public JWKS, plus
  webhook, session, TURN, and service secrets.

The source currently uses `apps/auth-api/wrangler.jsonc` for Worker routes,
D1, R2, and service configuration. Replace the upstream routes, account IDs,
database IDs, storage names, SMTP settings, Signal URL, and webhooks when you
prepare your own environment. Set `HOSTED_SERVERS_ENABLED` to `"false"`
and do not configure paid hosted server provisioning. Do not deploy the
upstream `openbot.run` routes or use its Cloudflare resources.

The repository requires encrypted `apps/auth-api/.env.dev` and
`apps/auth-api/.env.production` for shared account settings. Do not create
`apps/auth-api/.env.self-hosted`, `.env.local`, or new key pairs for Dotenvx.
The root `.env.keys` contains the existing Dotenvx keys. Use development
settings for local tests; keep your own production secrets isolated. The
current production deployment script and settings are tied to upstream
services. Review and change that implementation before any remote deploy.
See [account service setup](../apps/auth-api/README.md) for its current
requirements and [Privacy](../PRIVACY.md) for open issues.

## Point a desktop app to your service

When your independently configured service has passed verification, set
both environment variables before you start each desktop app. The Signal
URL must match the URL configured on your account Worker.

PowerShell:

```powershell
$env:OPENBOT_AUTH_API_URL = "https://api.example.com"
$env:OPENBOT_REMOTE_SIGNAL_URL = "wss://signal.example.com/v1/signal"
# Start the OpenBotFR executable from the location you installed it.
```

POSIX shell:

```sh
export OPENBOT_AUTH_API_URL=https://api.example.com
export OPENBOT_REMOTE_SIGNAL_URL=wss://signal.example.com/v1/signal
# Start the OpenBotFR executable from the location you installed it.
```

`OPENBOT_AUTH_API_URL` must use HTTPS, or HTTP on a loopback address.
`OPENBOT_REMOTE_SIGNAL_URL` must use WSS without user information, and
requires `OPENBOT_AUTH_API_URL`. The app refuses invalid values. On a
remote connection, enter the email code from your own SMTP service.

## Point a mobile app to your service

Set `EXPO_PUBLIC_OPENBOT_API_URL=https://api.example.com` before you create
the OpenBotFR mobile JavaScript bundle. The value must be an HTTPS origin,
or HTTP on a private-network development host. If this value is absent or
invalid, the email sign-in option is hidden. No upstream account service is
used as a default. A QR code can still name its own account service and host;
its host binding is checked when the phone connects. Existing saved sessions
continue to use their stored service address.

The mobile remote flow still needs a compatible account API and Signal, and
may need TURN. A phone-only local session without these services is not
implemented. The code path for a custom mobile account API was reviewed, but
mobile end-to-end tests have not run for this fork. See
[mobile configuration](../apps/mobile/README.md#optional-account-service).

The upstream browser client at `openbot.run/app` is not an OpenBotFR remote
client. The upstream release and Docker artifacts are not OpenBotFR packages.
Verify desktop-to-desktop access first.

## Data, changes, and recovery

The host remains the source of truth for agent workspaces, conversations,
and attachments. Back up its local data before you change a service. Do not
assume that a remote account database can restore local workspaces.
Keep the account service, Signal, and clients on compatible versions and
preserve existing account and ticket keys across updates. D1 migration and
production deployment require a separate review because they can affect
remote users and stored access data.
