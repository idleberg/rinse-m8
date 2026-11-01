# 48: Real update check, install and relaunch

**What to build:** Tauri's updater plugin drives the banner. On startup it checks the update manifest. Clicking Update downloads and installs with real progress, then relaunches the app. A failed check stays silent, since being offline is normal. A failed download or install shows in the existing error alert, and the banner gets its Update and Dismiss buttons back, so the user can retry or close it. Updates are signed: the user generates the key pair, and the public key goes into the app config. The check runs only at startup, which is a known limit for a tray app left running.

**Blocked by:** 47 (Update banner with a fake update for design review)

**Status:** ready-for-human

- [x] The updater and process plugins are registered with their permissions
- [x] The manifest endpoint points at the latest GitHub release's `latest.json`
- [ ] With no update there's no banner, and a failed check shows no error
- [ ] Update shows real progress, and the app relaunches on the new version
- [ ] A failed download or install shows in the error alert
- [ ] After a failure, the banner shows Update and Dismiss again instead of the stuck progress bar
- [ ] Manual check (human: key generation): install v0.3.3, serve a hand-written manifest for v0.3.4 locally, see the banner, update, and relaunch into v0.3.4

## Comments

- Plugins are registered in `src-tauri/src/lib.rs`, with `updater:default` and `process:allow-restart` in `src-tauri/capabilities/default.json`. The endpoint is in `src-tauri/tauri.conf.json`.
- `pubkey` in `tauri.conf.json` is empty until the key pair is generated (`bun tauri signer generate`). The plugin only uses the key to verify the download, so the check and banner still work, but Update fails with a signature error until the key is set.
- The check, progress, error alert and restored buttons are in `startUpdate` in `src/routes/+page.svelte`. They haven't been tried in the running app, so those boxes stay with the manual check.
- `bundle.createUpdaterArtifacts` isn't set. Ticket 49 needs it to build the signed bundles.
- Known limits: if the server sends no content length, progress stays at 0% until the relaunch. If the relaunch itself fails, Update downloads again.
