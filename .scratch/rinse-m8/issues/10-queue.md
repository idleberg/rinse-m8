# 10: Queue

**What to build:** An "add to queue" action on available rows, a visible queue in the player where items can be reordered and removed, automatic advance to the next item when an episode ends, and a queue that persists across restarts.

**Blocked by:** 09 (Player with resume)

**Status:** ready-for-agent

- [ ] The add-to-queue row action appends the episode to the queue
- [ ] When the current episode ends, the next queued item starts
- [ ] Queue items can be reordered and removed
- [ ] The queue is stored in the player state store and restored at launch
- [ ] Manual check: queue two episodes, seek near the end of the first; the second starts by itself
