# 03: Table filters

**What to build:** Controls above the table that narrow the episode list instantly: one checkbox per station, "mp3 available only" (on by default), "hide rebroadcasts", and a text search over episode title, show name and genres.

**Blocked by:** 02 (Schedule episodes in a table)

**Status:** resolved

- [x] Four station checkboxes, all on by default; unchecking one hides that station's rows
- [x] "mp3 available only" is on by default and hides rows without an available mp3
- [x] "hide rebroadcasts" hides rebroadcast rows
- [x] Text search matches title, show and genres case-insensitively
- [x] Filtering is a derived value over the episode list, with no table or filter library
- [x] `bun run check` passes
