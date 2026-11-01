# 48: Real update check, install and relaunch

**What to build:** Tauri's updater plugin drives the banner. On startup it checks the update manifest. Clicking Update downloads and installs with real progress, then relaunches the app. A failed check stays silent, since being offline is normal. A failed download or install shows in the existing error alert. Updates are signed: the user generates the key pair, and the public key goes into the app config. The check runs only at startup, which is a known limit for a tray app left running.

**Blocked by:** 47 (Update banner with a fake update for design review)

**Status:** ready-for-agent

- [ ] The updater and process plugins are registered with their permissions
- [ ] The manifest endpoint points at the latest GitHub release's `latest.json`
- [ ] With no update there's no banner, and a failed check shows no error
- [ ] Update shows real progress, and the app relaunches on the new version
- [ ] A failed download or install shows in the error alert
- [ ] Manual check (human: key generation): install v0.3.3, serve a hand-written manifest for v0.3.4 locally, see the banner, update, and relaunch into v0.3.4
