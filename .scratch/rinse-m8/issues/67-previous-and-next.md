# 67: PREV and NEXT on the Player tab

**What to build:** On the Player tab, PREV PLAY NEXT replace the single PLAY button at the far left of the controls row. The bottom bar keeps only PLAY.

- **NEXT** plays the first episode in the play queue, which leaves the queue as with auto-advance. It's disabled while the queue is empty.
- **PREV**, more than 3 seconds into an episode, seeks back to its start. Otherwise it plays the previously played episode from this session's history and puts the current episode back at the front of the queue. With no history, it seeks back to the start.
- The history holds the episodes played this session, from any table or the queue, and isn't saved.

**Blocked by:** 65 (Tab layout for the Player tab's controls)

**Status:** done

- [x] The Player tab shows PREV, PLAY and NEXT at the left of the row; the bar shows only PLAY
- [x] NEXT plays the first queued episode and takes it out of the queue
- [x] NEXT is disabled when the queue is empty
- [x] PREV after 3 seconds restarts the episode
- [x] PREV within 3 seconds plays the previous episode and puts the current one first in the queue
- [x] PREV with no history restarts the episode
- [x] The icons follow the stroke style of the other icons
