# 06: Subscriptions

**What to build:** A subscribe toggle on each row that follows or unfollows the row's show. Subscriptions persist across restarts. On subscribe, the show's existing episodes are marked as seen, so they never trigger notifications later. A "subscribed only" filter shows just followed shows.

**Blocked by:** 03 (Table filters), 05 (Refresh a show)

**Status:** ready-for-agent

- [ ] The settings store holds the subscriptions (slug and title) and the seen episode ids
- [ ] `subscribe(slug, title)` fetches the show and adds all of its currently available episode ids to seen
- [ ] `unsubscribe(slug)` removes the subscription
- [ ] `get_settings` and `set_settings` commands exist
- [ ] The row toggle reflects the current subscription state
- [ ] A "subscribed only" filter is added next to the existing filters
- [ ] Subscriptions survive an app restart
