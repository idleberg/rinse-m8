# 07: New-episode notifications

**What to build:** While the app is running, it checks every subscribed show at startup and then every 15 minutes. When a new episode with an mp3 appears, it sends a native OS notification ("New: <Show> – <dd/mm>"), marks the episode as seen and refreshes the table.

**Blocked by:** 06 (Subscriptions)

**Status:** ready-for-agent

- [x] The data module has a pure new-episode check: given the subscriptions, the seen ids and the fetched episodes, it returns the available, unseen episodes of subscribed shows
- [x] `cargo test` covers the new-episode check:
  - [x] it returns an unseen, available episode of a subscribed show
  - [x] it excludes seen episodes, unavailable episodes and episodes of unsubscribed shows
- [x] A tokio task spawned at app setup runs once immediately and then every 15 minutes
- [x] For each new episode, the task sends one native notification and adds the id to seen; it never notifies twice for the same episode, even across restarts
- [x] It emits `episodes-updated` and the table reloads
- [x] The notification permission is in the default capability
- [ ] Manual check: remove a subscribed show's id from seen in the settings file, restart, and one notification fires
