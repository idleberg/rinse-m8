# 09: Player with resume

**What to build:** A play button on available rows that starts streaming the episode in a bottom-bar player with seeking. The app remembers the position in the episode you're playing; playing another one starts it from the beginning and forgets the old position. At launch it restores the last-played episode, paused, where you left off.

**Blocked by:** 02 (Schedule episodes in a table)

**Status:** ready-for-human

- [x] The bottom bar uses a native `<audio>` element on the remote mp3; seeking works because the server supports byte ranges
- [x] The player state store holds the last-played id and its position (seconds)
- [x] The position is saved on time updates, throttled to about 5 s, and restored when the last-played episode loads
- [x] At launch, the last-played episode loads paused at its saved position
- [ ] Manual check: play, seek to the middle, quit, relaunch, press play; playback resumes there
