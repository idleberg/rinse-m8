# 02: Unseen count on the Dock icon

**What to build:** An on/off setting that shows the number of episodes in Latest (with Seen episodes left out) as a badge on the app's Dock icon. Off by default. The badge follows the same rules as Latest on the Dashboard, so marking an episode Seen, an episode refresh, a subscription change or a filter change updates it, whichever tab is open.

Use Tauri's built-in window badge count (macOS Dock; Linux launchers that support it; nothing on Windows), which needs the window permission for setting the badge count. A count of zero, or the setting being off, clears the badge. Nothing goes on the menu bar icon: while the window is closed to the menu bar the Dock icon is hidden, and so is the badge.

Known limit: an episode that ages past the Seen after setting only drops from the count on the next change to episodes, Seen or settings, since the clock isn't reactive. Leave a `ponytail:` comment saying so.

**Blocked by:** 01 (Share the Latest list beyond the Dashboard).

**Status:** ready-for-agent

- [x] Settings has a checkbox in the Window row, e.g. "show unseen count on Dock icon", off by default, stored with the other settings and restored on launch.
- [x] With it ticked, the Dock icon shows the number of episodes Latest lists with "show seen" unticked; with none, no badge.
- [x] Marking an episode Seen or unseen updates the badge right away, also when the Dashboard isn't the open tab.
- [x] Unticking the setting clears the badge.
- [x] Type check, `cargo check` and existing tests pass.
