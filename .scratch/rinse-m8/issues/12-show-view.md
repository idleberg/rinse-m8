# 12: Show view

**What to build:** Clicking a show name in any row opens the show view in place of the main view, with a back button to return. The show view lists that show's cached episodes straight away, then fetches the show from the show API in the background and updates the list. Its header has the show title and a subscribe toggle. Its only filters are "mp3 available only" (on by default) and "hide rebroadcasts". Because opening a show now refreshes it, the separate "refresh show" row action is removed.

**Blocked by:** 11 (Split the page into components)

**Status:** resolved

- [x] Show names in every table are clickable and open that show's show view
- [x] The show view is a `ShowView` component built from `EpisodeTable` and `EpisodeFilters`
- [x] Cached episodes of the show appear at once, and the background show fetch merges new ones into the cache and the list
- [x] The header shows the show title and a subscribe toggle that reflects and changes the subscription
- [x] Only the mp3-only and hide-rebroadcasts filters are shown, with the same defaults as the main view
- [x] The back button returns to the main view with its filters unchanged
- [x] The "refresh show" row action is gone
- [ ] Manual check: open a show you haven't refreshed before; its older episodes appear after a moment

## Comments

- The page runs the background fetch through `refresh_show`, which returns the whole cache. A poller update that lands while the fetch is running gets overwritten until the next update.
- The show view keeps the per-row subscribe buttons from `EpisodeTable` next to its header toggle.
