# 28: Show directory

**What to build:** A new Shows tab lists every show Rinse lists (about 1,588 of them), not only the ones in the schedule. A text search narrows the list by title and genres. Clicking a show opens its show view, where it can be subscribed to as usual, so any show can be followed.

The list comes from `GET https://www.rinse.fm/api/query/v1/shows/filter?offset=N`, the endpoint behind rinse.fm's Artists page:

- `offset` is a page index (0, 1, 2…), not an item offset. Each page has 20 shows, and an empty `entries` marks the end. There's no total count.
- Each entry carries `slug`, `title`, `genreTag[].title` and `channel[0].slug`. The channel slug maps to a station like an episode's does, and unknown slugs pass through.
- The API has no free-text search, so the app filters locally.
- Walking all 80 pages one at a time takes about 95 s.

The app fetches the pages one at a time in the background and caches the list. It refreshes the list when it's missing or more than a day old, and a failed refresh keeps the old list and retries later. The Shows tab shows the cached list at once and updates when a refresh finishes.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] The nav has a Shows tab listing every show in the directory, with its station and genres
- [x] A search box filters the directory by show title and genres as you type
- [x] Clicking a show opens its show view, and subscribing there adds it to the dashboard, even for a show that isn't in the schedule
- [x] The directory is cached, shows instantly after a restart, and refreshes in the background when it's more than a day old
- [x] A failed page keeps the previous directory, so a partial list never replaces a complete one
- [x] While there's no cached directory yet, the tab says it's loading
- [x] Unit test: mapping a show index response (fixture) yields each show's slug, title, station and genres, including one on a non-station channel
- [x] GLOSSARY.md defines **Show directory**
- [x] The spec's data source contract documents the `shows/filter` endpoint
