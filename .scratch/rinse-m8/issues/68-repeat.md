# 68: Repeat button

**What to build:** A repeat button at the far right of the Player tab's controls row. It cycles through three states: off, repeat all, repeat one. The state is kept across restarts.

- **Repeat all** repeats the entire play queue. An episode that finishes, or is skipped with NEXT, goes back to the end of the queue, so the queue loops. NEXT then also works with an empty queue by restarting the current episode. PREV doesn't leave a second copy of the previous episode at the end of the queue.
- **Repeat one** repeats the current episode: it starts over when it ends, and counts as a new listen for Last.fm. NEXT still skips to the next queued episode.
- The button shows as pressed in both repeat states. Repeat one is told apart by the accent colour, and the title names the current state.

**Blocked by:** 67 (PREV and NEXT on the Player tab)

**Status:** done

- [x] The repeat button sits at the far right of the row on the Player tab, not in the bar
- [x] Clicking it cycles off → all → one → off, and the state survives a restart
- [x] Repeat all: with two queued episodes, playback keeps looping through all three, including after seeking to the end
- [x] Repeat all: NEXT puts the skipped episode at the end of the queue
- [x] Repeat one: the episode starts over when it ends; NEXT still skips
- [x] Off: playback behaves as before, stopping when the queue runs out
