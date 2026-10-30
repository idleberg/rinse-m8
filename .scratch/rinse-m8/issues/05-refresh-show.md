# 05: Refresh a show

**What to build:** A row action that pulls the ~30 most recent episodes of that row's show from the public show API. They're merged into the cache, and the table grows to include older episodes of that show.

**Blocked by:** 02 (Schedule episodes in a table)

**Status:** ready-for-agent

- [x] The data module maps a raw show response to Episodes, using the same rules as the schedule
- [x] A small show-response fixture plus a `cargo test` check that its episodes map correctly
- [x] The `refresh_show(slug)` command fetches the show, merges it into the cache and returns the updated episodes
- [x] The row action triggers it and the table updates
