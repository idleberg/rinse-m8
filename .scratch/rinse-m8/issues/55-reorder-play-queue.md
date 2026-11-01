# 55: Reorder the play queue

**What to build:** Rows in the Player tab's play queue can be dragged to any position with native HTML drag and drop, the same way waiting downloads are reordered in the queue view (ticket 24). Keyboard users move a focused row with Alt+↑/↓, and the row keeps focus after it moves. The new order is the order auto-advance follows, and it's saved like the rest of the queue.

**Blocked by:** 54 (Play queue), 56 (Drag style for reorderable rows)

**Status:** ready-for-agent

- [ ] A queued episode can be dragged to any position, including the top and bottom
- [ ] Dragging shows the shared drag style: the dragged row is muted and an accent line marks where it will land
- [ ] Alt+↑/↓ moves a focused row one place and keeps it focused
- [ ] The new order survives a restart and is the order auto-advance plays in
- [ ] Unit test: moving an episode to an index reorders the list; an unknown id or out-of-range index changes nothing
- [ ] Manual check: queue three episodes, drag the third to the top, restart; the order holds
