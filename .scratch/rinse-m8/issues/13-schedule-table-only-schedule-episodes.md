# 13: Schedule table shows only schedule episodes

**What to build:** The schedule table lists only episodes that have appeared in Rinse's schedule feed, including ones that have since dropped out of its 7-day window. Episodes fetched only through a show (by the show view, subscribing, or the background check) stay out of it. Episodes already in the cache count as schedule episodes, so nothing disappears from the existing history.

**Blocked by:** 11 (Split the page into components)

**Status:** ready-for-human

- [x] Each cached episode records whether it has appeared in the schedule feed
- [x] A later show fetch of the same episode never clears that mark
- [x] Cache entries written before this change count as schedule episodes
- [x] The schedule table shows only marked episodes
- [x] A `cargo test` check: merging a show fetch over a schedule episode keeps the mark, and a show-only episode stays unmarked
- [ ] Manual check: open the show view of an old show; its older episodes don't appear in the schedule table afterwards
