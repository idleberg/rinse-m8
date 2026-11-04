# 01: Persisted play history on the Player tab

**What to build:** A History section below the Play Queue on the Player tab, in the same design language: an uppercase heading and the same table (date, show with the episode subtitle). Starting a new listen of an episode puts it at the top of the list. The list holds each episode once, so replaying one moves it back to the top. The list survives a relaunch, capped at a fixed number of entries so the player store stays small. Rows have the hover Play button, as queue rows do. The table shows the first 20 entries, and a button below it (like "Show all" in My Shows) reveals the next 20 each time it's pressed, with the remaining count in its label. An empty list reads "Nothing played yet".

PREV keeps its own session stack and stays separate from this list, so going back doesn't remove anything from History.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Playing an episode adds it to the top of History; pausing and resuming doesn't add it again
- [x] Replaying an episode moves it to the top instead of duplicating it
- [x] History survives an app relaunch and is capped (a `ponytail:` comment names the cap)
- [x] Only 20 rows show at first; the reveal button adds 20 at a time and disappears once all are shown
- [x] The hover Play button plays the episode, using the cache's current copy (artwork, mp3)
- [x] PREV behaves exactly as before
- [x] A player test covers ordering, de-duplication and persistence
