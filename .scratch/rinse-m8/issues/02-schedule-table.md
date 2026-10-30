# 02: Schedule episodes in a table

**What to build:** On launch, the app shows a table of the last ~7 days of episodes from Rinse FM, Rinse FR, Kool FM and SWU FM, fetched from the public schedule API. Every episode it has seen is cached locally, so history builds up over time. See the "Domain rules" section of the spec.

**Blocked by:** 01 (Dependency refresh and switch to bun)

**Status:** resolved

- [x] The Rust data module maps a raw schedule response to a flat Episode type with: id, title, show id/slug/title, station, date, time, length, rebroadcast, genres and an optional mp3 URL
- [x] A saved live schedule response is checked in as a test fixture
- [x] `cargo test` asserts that:
  - [x] null and placeholder file URLs give no mp3, and `.mp3` URLs are kept
  - [x] all four station slugs map to the right station names
  - [x] show fields are populated
  - [x] `episodeDate` comes out as the London date
  - [x] the time comes from `episodeTime`, with its date part ignored
- [x] The episode cache is stored as a file and keyed by id, and each fetch merges into it (unbounded, marked with a ponytail note)
- [x] The `get_episodes` command returns the cache merged with a fresh schedule fetch
- [x] The page shows one table with Date, Time, Station, Show, Title and a Rebroadcast badge, formatted in Europe/London
- [x] The nonexistent `fetch_schedule` call is gone from the page

## Comments

- `episodeTime` is the London wall-clock time on today's date, converted with today's offset. Convert it back with that same offset, not the broadcast date's. All 244 titled episodes in the fixture match this, including 26 broadcast in BST (e.g. "DJ Flight - 14/10/2026 - 19:00" has `T19:00Z`).
- Episode `genreTag` is empty for 120 of the 200 fixture episodes. Issue 03's text filter may want to fall back to `parentShow[0].genreTag`.
