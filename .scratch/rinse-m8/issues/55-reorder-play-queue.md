# 55: Reorder the play queue

**What to build:** Rows in the Player tab's play queue can be dragged to any position with native HTML drag and drop, the same way waiting downloads are reordered in the queue view (ticket 24). Keyboard users move a focused row with Alt+↑/↓, and the row keeps focus after it moves. The new order is the order auto-advance follows, and it's saved like the rest of the queue.

**Blocked by:** 54 (Play queue), 56 (Drag style for reorderable rows)

**Status:** ready-for-human

- [x] A queued episode can be dragged to any position, including the top and bottom
- [x] Dragging shows the shared drag style: the dragged row is muted and an accent line marks where it will land
- [x] Alt+↑/↓ moves a focused row one place and keeps it focused
- [x] The new order survives a restart and is the order auto-advance plays in
- [x] Unit test: moving an episode to an index reorders the list; an unknown id or out-of-range index changes nothing
- [ ] Manual check: queue three episodes, drag the third to the top, restart; the order holds

## Comments

Moves go by index rather than id, since the play queue can hold the same episode twice. `moveItem` in `src/lib/episodes.ts` takes the place of the unknown-id case with an out-of-range source index. A drag that is still in progress when auto-advance takes the first episode drops onto shifted indices, which is a narrow window left as is.
