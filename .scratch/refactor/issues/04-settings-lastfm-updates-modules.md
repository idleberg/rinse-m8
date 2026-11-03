# 04: Settings, subscriptions, Last.fm and updates modules

**What to build:** Three rune modules take over the remaining app-wide state:

- `settings`: the stored settings including subscriptions; subscribe/unsubscribe (with its in-progress list and confirmation), import/export subscriptions, choosing the download folder, the checkboxes and both intervals with their roll-back on a failed save
- `lastfm`: the connection state, connect/cancel/disconnect, and the `lastfm-disconnected` event
- `updates`: the launch and interval app update checks, the manual "Check now" cooldown, download and install, dismissing a version, and the fake-update dev mode

The settings view, the subscribe buttons and the update banner read these modules directly instead of through props.

**Blocked by:** 02 (Errors and confirm modules, init pattern, ADR)

**Status:** ready-for-agent

- [ ] Every Settings row works as before: folder, auto-download, keep running, both intervals, Check now, import/export, Last.fm connect/cancel/disconnect
- [ ] Subscribing and unsubscribing work from every table, show section and the show view
- [ ] The update banner appears, downloads with progress, and dismisses as before, including under the fake-update dev mode
- [ ] The settings view takes no props
- [ ] `bun test` and `svelte-check` pass
