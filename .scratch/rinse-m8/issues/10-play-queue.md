# 10: Play queue

**What to build:** An "add to play queue" action on available rows, a visible play queue in the player where items can be reordered and removed, automatic advance to the next item when an episode ends, and a play queue that persists across restarts.

**Blocked by:** 09 (Player with resume)

**Status:** wontfix

- [ ] The add-to-play-queue row action appends the episode to the play queue
- [ ] When the current episode ends, the next item in the play queue starts
- [ ] Play queue items can be reordered and removed
- [ ] The play queue is stored in the player state store and restored at launch
- [ ] Manual check: add two episodes to the play queue, seek near the end of the first; the second starts by itself

## Comments

Cancelled before implementation; a follow-up ticket will replace it.
