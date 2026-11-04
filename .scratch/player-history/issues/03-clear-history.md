# 03: Clear History

**What to build:** A Clear History button on the right edge of the History header, shown only when History has entries, mirroring Clear Queue. It asks for confirmation with the app's confirm dialog. Once confirmed, it empties the list and its stored copy.

**Blocked by:** 01 (Persisted play history on the Player tab)

**Status:** ready-for-agent

- [ ] The button appears only when History has entries, placed like Clear Queue
- [ ] Cancelling the confirmation leaves History untouched
- [ ] Confirming empties History, and it stays empty after a relaunch
- [ ] PREV still works after clearing, since its session stack is separate
