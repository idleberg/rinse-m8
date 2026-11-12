# 01: Flyout on the Dashboard

**What to build:** The flyout and its trigger, proven on the Dashboard. Each row in Latest and in the show sections ends with Play, Download (or Show in folder), and the flyout trigger. The X button ("Mark as downloaded") leaves the row and becomes the flyout's first entry, MARK AS DOWNLOADED, disabled once the episode is downloaded. Latest's subscribe button, today shown only on hover, leaves the row too and becomes SUBSCRIBE/UNSUBSCRIBE in Latest's flyout, keeping the confirmation on unsubscribe. See `../spec.md` for how the flyout behaves.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] A Dashboard row shows at most three buttons, the last being the flyout trigger
- [x] The trigger opens the flyout; Escape, a click outside and choosing an entry close it
- [x] The arrow keys move between entries and focus returns to the trigger on close
- [x] The flyout isn't clipped by the table or the window edge
- [x] MARK AS DOWNLOADED marks the episode and is disabled for a downloaded one
- [x] Latest's flyout has SUBSCRIBE or UNSUBSCRIBE by the show's state, exposed as a checkable item; UNSUBSCRIBE still asks first
- [x] The hover-only subscribe button and the X button are gone from the rows
- [ ] Works in the macOS, Windows and Linux webviews

## Comments

Verified in Chrome against the Vite dev server with mocked Tauri commands: three buttons per row, open and close by trigger, Escape, click outside and entry, arrow keys, focus return (also after the Unsubscribe confirmation), placement above and below, and a disabled MARK AS DOWNLOADED for a downloaded episode. Windows' WebView2 is Chromium, but the macOS and Linux webviews (WebKit) are untested, so the last box stays open until checked there.
