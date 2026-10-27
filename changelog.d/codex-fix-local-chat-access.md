### Fixed

- Local conversations now load and save read status without an OpenBotFR account. Read status is kept when a local user signs in.
- Codex receives explicit instructions to call OpenBot tools directly and stop repeated calls through an unavailable tool path.
- Unknown tool calls no longer add generic progress lines to the conversation. Tool traces and failure messages remain available.
