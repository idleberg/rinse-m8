# 02: Errors and confirm modules, init pattern, ADR

**What to build:** Error reporting and confirmation dialogs become shared state instead of page-local variables and `bind:this`. An `errors` rune module holds the banner message and a `report()` helper, and owns the offline/online handling. A `confirm()` function, backed by a small rune module, asks the question; the confirm dialog renders from that state. This ticket also sets the conventions every later module follows, and records them in an ADR.

Conventions (decided in grilling):

- A module is a `.svelte.ts` class with `$state`/`$derived` fields and methods, exported as a single instance
- Modules are flat files in `lib/`; a module becomes a folder only once it spans more than one file
- Modules call `invoke` directly, no API wrapper layer
- Loads, `listen`s and `$effect`s go in the module's `init()`, called once from the root component (the page for now, the root layout after 07); nothing runs at import time
- Modules catch their own errors and hand them to `errors`, so call sites need no `.catch(showError)`
- A component reads a module directly when every instance would see the same value; props only carry what varies per instance

**Blocked by:** 01 (Components folder and `$lib` imports)

**Status:** done

- [x] An error banner shows, dismisses, and the offline message clears on going back online as before
- [x] Unsubscribe, clear play queue, clear downloads, clear image cache and disconnect Last.fm each confirm as before, through `confirm()`
- [x] The confirm dialog is no longer driven through `bind:this`
- [x] An ADR in `docs/adr/` records routes plus singleton rune modules read directly by components, with the conventions above
- [x] `bun test` and `svelte-check` pass
