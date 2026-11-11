# 01: Flyout on the Dashboard

**What to build:** The flyout and its trigger, proven on the Dashboard. Each row in Latest and in the show sections ends with Play, Download (or Show in folder), and the flyout trigger. The X button ("Mark as downloaded") leaves the row and becomes the flyout's first entry, MARK AS DOWNLOADED, disabled once the episode is downloaded. Latest's subscribe button, today shown only on hover, leaves the row too and becomes SUBSCRIBE/UNSUBSCRIBE in Latest's flyout, keeping the confirmation on unsubscribe. See `../spec.md` for how the flyout behaves.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] A Dashboard row shows at most three buttons, the last being the flyout trigger
- [ ] The trigger opens the flyout; Escape, a click outside and choosing an entry close it
- [ ] The arrow keys move between entries and focus returns to the trigger on close
- [ ] The flyout isn't clipped by the table or the window edge
- [ ] MARK AS DOWNLOADED marks the episode and is disabled for a downloaded one
- [ ] Latest's flyout has SUBSCRIBE or UNSUBSCRIBE by the show's state, exposed as a checkable item; UNSUBSCRIBE still asks first
- [ ] The hover-only subscribe button and the X button are gone from the rows
- [ ] Works in the macOS, Windows and Linux webviews
