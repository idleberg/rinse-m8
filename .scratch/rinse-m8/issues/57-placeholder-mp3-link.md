# 57: A show fetch without an mp3 doesn't hide the episode

**What to build:** Rinse's show feed sometimes sends a placeholder file link (`https://replay.rinse.fm/uk/`) for an episode whose schedule entry has the real mp3. Seen with Oneman 2026/11/01 (id 2320658). The startup update merges both copies, the show copy replaces the schedule copy, and the episode ends up with no mp3. My Shows then hides it a few seconds after launch, because of the default "mp3 only" filter. Opening the show erases the link the same way.

Two fixes, which ship together:

- Merging a fetched episode that has no mp3 keeps the link the cache already holds. The check result is kept only while the link stays the same. If Rinse really removed the file, the episode still gets hidden, because the kept link fails its check.
- Copies of the same episode in one update (schedule and show feed) are merged with each other, so a later copy doesn't replace an earlier one. This also stops a new episode losing its schedule mark on its first fetch.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Oneman 2026/11/01 stays on My Shows after the startup update, with the "mp3 only" filter on
- [ ] Opening a show whose feed sends a placeholder link keeps the episode's mp3
- [ ] When the schedule and show copies of an episode arrive in the same update, the result has the schedule's mp3 and the schedule mark
- [ ] A test covers merging a fetched copy without an mp3 into a cached copy that has one, and checks that the link and check result are kept
- [ ] The existing test that a changed link resets the check result still passes
