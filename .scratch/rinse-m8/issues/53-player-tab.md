# 53: Player tab with cover and controls

**What to build:** A **Player** tab right after "My Shows". It follows the app's design: the same buttons and type, uppercase labels.

- Left: a square cover, at most 20rem wide, with the image filling the square edge to edge (cropped, not letterboxed). It shows the episode's artwork if there is one, otherwise the show's. If neither exists or the image fails to load, the square is black with "No artwork for this show" centred horizontally and vertically.
- Right: the same controls as the bottom bar, kept in sync with it. The bottom bar stays visible on this tab.
- With nothing loaded, the tab shows the black square and "Nothing playing" in place of the controls.

**Blocked by:** 51 (Episode artwork in the episode cache), 52 (Shared player controls)

**Status:** ready-for-agent

- [ ] The nav shows "Player" right after "My Shows", highlighted like the other tabs when open
- [ ] The cover shows the episode image, falls back to the show image, then to the black "No artwork for this show" square
- [ ] The cover is square and fully covered by the image, with no margins
- [ ] Play, pause, seek and the time toggle on the tab and in the bar stay in sync
- [ ] Manual check: play an episode with artwork, one with only show artwork and one with none, and confirm each cover
