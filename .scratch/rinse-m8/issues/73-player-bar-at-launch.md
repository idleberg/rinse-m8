# 73: Show the player bar at launch when an episode is restored

**What to build:** At relaunch, the last-played episode shows in the bottom player bar, paused at its saved position, without having to press play first. This undoes the "hide player bar until first play" behaviour. The bar stays hidden only when there's no playable episode: nothing has ever been played, the last-played episode is no longer in the cache, or it has no mp3.

**Blocked by:** None (can start immediately)

**Status:** ready-for-human (needs a relaunch check in the app)

- [x] After a relaunch, the bar shows the restored episode, paused at its saved position.
- [ ] With nothing ever played, there's no bar.
- [x] The restored episode still doesn't go into PREV history until something has played this session.

## Comments

- Dropped `hidden={!shown}` on the player `<footer>`. The existing `{#if episode?.mp3}` already hides the bar when there's no playable episode, and `onloadedmetadata` restores the saved position.
- Renamed `shown` to `played` (a plain `let`, since nothing renders from it any more). It still gates the PREV history push, so criterion 3 is unchanged.
- Criteria 1 and 2 need a relaunch in the app.
