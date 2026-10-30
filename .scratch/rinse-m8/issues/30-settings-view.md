# 30: Settings view

**What to build:** A new Settings tab collects the app-level options in one place. It shows the download folder, with a button to change it, and the auto-download checkbox, which moves here from the dashboard. Both persist across restarts. The dashboard keeps "show downloaded", since that's a view filter, not a setting. Queueing a download with no folder set still asks for one first.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] The nav has a Settings tab
- [x] Settings shows the current download folder, or that none is set, and a button that picks a new one
- [x] The auto-download checkbox is in Settings and no longer on the dashboard
- [x] Changing either setting survives a restart, and a failed save leaves the old value showing
- [x] Downloading with no folder set still asks for one, and the chosen folder then shows in Settings
