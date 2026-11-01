# 56: Drag style for reorderable rows

**What to build:** Dragging a waiting download in the queue view shows what's moving and where it will land. Today the only cue is the grab cursor.

- The row being dragged turns muted, subtitle included.
- A 2px accent line on the hovered row marks the drop position:
  - below the hovered row when dragging down
  - above it when dragging up
  - nothing on the dragged row itself

  This matches where the row actually ends up when dropped.
- Everything clears when the drag ends, whether it was dropped or cancelled.
- The styles are shared rather than local to the queue view, so the play queue (ticket 55) uses the same look. They must keep the tables' dashed row lines intact.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] While dragging, the dragged row is muted
- [ ] The accent line shows below the hovered row when dragging down and above it when dragging up, and the row lands exactly there on drop
- [ ] Dropping, or cancelling with Escape or by dropping outside the table, clears all drag styling
- [ ] The dashed row lines and the Alt+↑/↓ keyboard move are unchanged
- [ ] The drag styles live with the app's shared styles, ready for other tables
- [ ] Manual check: queue three downloads, drag the first to the bottom and back up, and watch the line track the drop position in both directions, in light and dark theme
