# 03: Table filters

**What to build:** Controls above the table that narrow the episode list instantly: one checkbox per station, "mp3 available only" (on by default), "hide rebroadcasts", and a text search over episode title, show name and genres.

**Blocked by:** 02 (Schedule episodes in a table)

**Status:** ready-for-agent

- [ ] Four station checkboxes, all on by default; unchecking one hides that station's rows
- [ ] "mp3 available only" is on by default and hides rows without an available mp3
- [ ] "hide rebroadcasts" hides rebroadcast rows
- [ ] Text search matches title, show and genres case-insensitively
- [ ] Filtering is a derived value over the episode list, with no table or filter library
- [ ] `bun run check` passes
