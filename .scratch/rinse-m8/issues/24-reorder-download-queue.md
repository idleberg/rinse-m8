# 24: Reorder the download queue by drag and drop

**What to build:** In the queue view, waiting downloads can be dragged into a new order with native HTML drag and drop, and the download queue then works through them in that order. Keyboard users move a focused row with Alt+↑/↓. Tauri's native file-drop handling intercepts HTML drag events, so it's turned off for the window; the app doesn't accept dropped files.

**Blocked by:** 23 (Download queue view)

**Status:** ready-for-agent

- [ ] Waiting rows can be dragged to a new position; the running download can't be moved
- [ ] Alt+↑/↓ moves a focused waiting row one place
- [ ] The new order is saved, survives a restart, and is the order downloads start in
- [ ] Unit test: moving a waiting download to an index reorders only the waiting downloads; an unknown id or out-of-range index changes nothing
- [ ] Manual check: queue three downloads, drag the third above the second, restart; the order holds and downloads follow it
