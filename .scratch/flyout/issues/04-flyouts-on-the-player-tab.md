# 04: Flyouts on the Player tab

**What to build:** Both Player tab tables get the flyout. Play queue rows keep Play and add the trigger, with Remove moving into the flyout like history's; their flyout has REMOVE FROM QUEUE, then SUBSCRIBE/UNSUBSCRIBE for the episode's show, then LOVE/UNLOVE. Remove from queue doesn't ask, as Remove didn't. History rows keep Play and add the trigger; their flyout has REMOVE FROM HISTORY, then SUBSCRIBE/UNSUBSCRIBE, then LOVE/UNLOVE. Remove from history asks first, like Clear History, and drops just that entry from the saved history.

**Blocked by:** 03

**Status:** resolved

- [x] Play queue rows show Play and the flyout trigger
- [x] The play queue flyout lists REMOVE FROM QUEUE, SUBSCRIBE/UNSUBSCRIBE, LOVE/UNLOVE
- [x] Opening the flyout or choosing an entry doesn't start a drag or move the row; Alt+arrow reordering still works
- [x] History rows show Play and the flyout trigger
- [x] The history flyout lists REMOVE FROM HISTORY, SUBSCRIBE/UNSUBSCRIBE, LOVE/UNLOVE
- [x] REMOVE FROM HISTORY asks first and, once confirmed, removes only that entry
- [x] A removed entry stays gone after a restart
