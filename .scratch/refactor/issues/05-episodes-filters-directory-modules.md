# 05: Episodes, filters and directory modules

**What to build:** The episode cache, the sticky filters and the show directory become rune modules:

- `episodes`: the cached episodes (dead ones dropped, newest first), the loading flag, and the `episodes-updated` event
- `filters`: shown stations, search, mp3 only and hide rebroadcasts, remembered across restarts as before (search isn't)
- `directory`: the show directory with its background refresh, and each show's last aired date, refetched when the Shows tab opens

The station/search predicate that the episode and directory filtering each spell out becomes one pure function, covered by a `bun test`. The episode tables, show sections and filter bar take only what varies per instance.

**Blocked by:** 02 (Errors and confirm modules, init pattern, ADR)

**Status:** done

- [x] The dashboard, schedule and Shows tab list and filter exactly as before, including the hide-older-than filter
- [x] Filter checkboxes survive a restart; the search doesn't
- [x] A test covers the shared station/search predicate
- [x] Episode tables no longer receive state that is the same for every instance
- [x] `bun test` and `svelte-check` pass
