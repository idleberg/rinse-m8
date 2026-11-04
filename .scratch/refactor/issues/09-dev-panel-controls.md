# 09: Dev panel controls for the remaining conditional UI

**What to build:** The dev panel gets a control for every other piece of UI that only appears under a condition, each faking state in the module that owns it:

- Download bar: a fake running download with moving progress and a few waiting items
- Player bar: the first cached episode that has an mp3, loaded paused
- Error banner: a sample error, or the offline message
- Confirm dialog: a sample confirmation opened through `confirm()`

A real event, such as a `download-queue` update, may replace faked state.

**Blocked by:** 08 (Dev panel with the fake update)

**Status:** ready-for-human (needs a look in `mise run dev`: each control against its bar, banner or dialog)

- [x] The download control shows and hides the download bar, with moving progress and a waiting count
- [ ] The player control shows the player bar with a cached episode, paused
- [ ] The error control shows a sample error and the offline message, each dismissable as usual
- [ ] The confirm control opens the confirm dialog, and both answers close it
- [x] `bun test` and `svelte-check` pass
