# 14: Subscribed table

**What to build:** The main view shows two tables under one shared filter bar: the subscribed table first, listing episodes from every subscribed show newest first, then the schedule table. Without any subscriptions, the subscribed table is replaced by a one-line hint ("Subscribe to a show to see its episodes here"). The "subscribed only" filter is removed, since the subscribed table replaces it. Subscribing to a show now also adds its recent episodes to the cache, so they appear in the subscribed table straight away.

**Blocked by:** 11 (Split the page into components), 13 (Schedule table shows only schedule episodes)

**Status:** ready-for-agent

- [ ] The subscribed table and the schedule table are both `EpisodeTable`s, stacked subscribed table first
- [ ] One `EpisodeFilters` bar (stations, mp3 only, hide rebroadcasts, free text) filters both tables
- [ ] The "subscribed only" filter is gone
- [ ] With no subscriptions, a hint takes the subscribed table's place
- [ ] `subscribe` merges the fetched show episodes into the cache and the frontend shows them right away
- [ ] The subscribed table updates when the background check emits `episodes-updated`
- [ ] Manual check: subscribe to a show from the schedule table; its recent episodes appear in the subscribed table at once
