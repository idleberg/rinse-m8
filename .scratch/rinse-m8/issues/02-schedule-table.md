# 02: Schedule episodes in a table

**What to build:** On launch, the app shows a table of the last ~7 days of episodes from Rinse FM, Rinse FR, Kool FM and SWU FM, fetched from the public schedule API. Every episode it has seen is cached locally, so history builds up over time. See the "Domain rules" section of the spec.

**Blocked by:** 01 (Dependency refresh and switch to bun)

**Status:** ready-for-agent

- [ ] The Rust data module maps a raw schedule response to a flat Episode type with: id, title, show id/slug/title, station, date, time, length, rebroadcast, genres and an optional mp3 URL
- [ ] A saved live schedule response is checked in as a test fixture
- [ ] `cargo test` asserts that:
  - [ ] null and placeholder file URLs give no mp3, and `.mp3` URLs are kept
  - [ ] all four station slugs map to the right station names
  - [ ] show fields are populated
  - [ ] `episodeDate` comes out as the London date
  - [ ] the time comes from `episodeTime`, with its date part ignored
- [ ] The episode cache is stored as a file and keyed by id, and each fetch merges into it (unbounded, marked with a ponytail note)
- [ ] The `get_episodes` command returns the cache merged with a fresh schedule fetch
- [ ] The page shows one table with Date, Time, Station, Show, Title and a Rebroadcast badge, formatted in Europe/London
- [ ] The nonexistent `fetch_schedule` call is gone from the page
