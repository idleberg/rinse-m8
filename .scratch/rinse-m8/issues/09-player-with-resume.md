# 09: Player with resume

**What to build:** A play button on available rows that starts streaming the episode in a bottom-bar player with seeking. The app remembers the position in every episode, and at launch it restores the last-played episode, paused, where you left off.

**Blocked by:** 02 (Schedule episodes in a table)

**Status:** ready-for-agent

- [ ] The bottom bar uses a native `<audio>` element on the remote mp3; seeking works because the server supports byte ranges
- [ ] The player state store holds per-episode positions (seconds) and the last-played id
- [ ] The position is saved on time updates, throttled to about 5 s, and restored whenever an episode loads
- [ ] At launch, the last-played episode loads paused at its saved position
- [ ] Manual check: play, seek to the middle, quit, relaunch, press play; playback resumes there
