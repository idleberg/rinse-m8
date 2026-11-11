# 04: Flyouts on the Player tab

**What to build:** Both Player tab tables get the flyout. Play queue rows keep Play and Remove and add the flyout trigger; their flyout has SUBSCRIBE/UNSUBSCRIBE for the episode's show, then LOVE/UNLOVE. History rows keep Play and add the trigger; their flyout has REMOVE FROM HISTORY, then SUBSCRIBE/UNSUBSCRIBE, then LOVE/UNLOVE. Remove from history asks first, like Clear History, and drops just that entry from the saved history.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] Play queue rows show Play, Remove and the flyout trigger
- [ ] The play queue flyout lists SUBSCRIBE/UNSUBSCRIBE then LOVE/UNLOVE
- [ ] Opening the flyout or choosing an entry doesn't start a drag or move the row; Alt+arrow reordering still works
- [ ] History rows show Play and the flyout trigger
- [ ] The history flyout lists REMOVE FROM HISTORY, SUBSCRIBE/UNSUBSCRIBE, LOVE/UNLOVE
- [ ] REMOVE FROM HISTORY asks first and, once confirmed, removes only that entry
- [ ] A removed entry stays gone after a restart
