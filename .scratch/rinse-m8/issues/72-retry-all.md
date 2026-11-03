# 03: Retry All in the Active Downloads heading

**What to build:** A RETRY ALL button in the Active Downloads heading, on the right edge as Clear Downloads is in the Previous Downloads heading. It shows only when 2 or more downloads have failed. It moves every failed entry to the front of the waiting downloads, keeping the order they failed in, and wakes the queue.

**Blocked by:** 01 (Keep failed downloads in a list)

**Status:** ready-for-human (needs a look in the app: Active Downloads heading spacing)

- [x] The button is hidden with 0 or 1 failures and shows with 2 or more
- [x] Retry All empties the failed list and puts the entries at the front of the waiting downloads, oldest failure first
- [x] The first download starts right away if the queue was idle
- [ ] The Active Downloads heading keeps its spacing at the top of the view
- [x] A queue unit test covers retrying all failures in order, and `cargo test` and `bun run check` pass

## Comments

- Command is `retry_all_downloads`. The heading is now a `<header class="first">` with `margin-top: 0`, matching the old bare `h2` margins; not checked in the app.
