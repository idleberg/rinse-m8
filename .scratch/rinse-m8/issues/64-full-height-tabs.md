# 64: Full-height tabs

**What to build:** The nav tabs become full-height cells instead of small bordered buttons in a padded bar. They run flush from the left window edge, with **Settings** flush at the right edge. A single 1px line separates neighbouring tabs. Nowhere does a 2px line show, and there's no line along the window edges. The bar's bottom line stays the only horizontal one. **Settings** shows the word SETTINGS instead of the sliders icon.

The bar keeps its current height, which matches the player bar (40px including the bottom line).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Tabs fill the bar's full height and start at the left window edge, with **Settings** at the right edge.
- [ ] One 1px line between each pair of tabs and to the left of **Settings**, none at the window edges, no doubled lines.
- [ ] **Settings** is a text tab reading SETTINGS, with no icon.
- [ ] The tab bar is exactly as tall as the player bar.
- [ ] The active tab is filled across its whole cell, with no gap at the top or bottom.
- [ ] Tabs don't wrap at narrow window widths, and keyboard focus stays visible.
