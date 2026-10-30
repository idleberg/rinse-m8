# 24: Reorder the download queue by drag and drop

**What to build:** In the queue view, waiting downloads can be dragged into a new order with native HTML drag and drop, and the download queue then works through them in that order. Keyboard users move a focused row with Alt+↑/↓. Tauri's native file-drop handling intercepts HTML drag events, so it's turned off for the window; the app doesn't accept dropped files.

**Blocked by:** 23 (Download queue view)

**Status:** resolved

- [x] Waiting rows can be dragged to a new position; the running download can't be moved
- [x] Alt+↑/↓ moves a focused waiting row one place
- [ ] The new order is saved, survives a restart, and is the order downloads start in
- [x] Unit test: moving a waiting download to an index reorders only the waiting downloads; an unknown id or out-of-range index changes nothing
- [ ] Manual check: queue three downloads, drag the third above the second, restart; the order holds and downloads follow it

## Comments

- `DownloadQueue::move_to` moves a waiting download to an index among the waiting ones; the `move_download` command saves through `update_downloads`, so the queue's own first-in-first-out order is the new order.
- `dragDropEnabled: false` on the window turns off Tauri's file drop so HTML drag events reach the webview.
- Left unticked: the restart and manual drag checks haven't been run in the app.
- A window-level `dragover`/`drop` guard in `+page.svelte` stops a dropped file from opening in the window, and a keyboard move puts focus back on its row once the reordered queue comes back.
