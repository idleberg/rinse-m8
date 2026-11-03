# 74: Cache show records

**What to build:** When you open a show view you've opened before, its description and image show at once from a locally kept **show record**, before the network refresh comes back. Each refresh updates the record. Records are keyed by show slug and stored the same way as the other app stores (Rust-side, not in the webview), so later features (last aired date, favourites) can add fields to the same record.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] A show refresh writes the show's description and image to its show record.
- [ ] Opening a previously opened show view renders the cached description and image before the refresh finishes, then shows the refreshed ones.
- [ ] Opening a show offline still shows its cached description and image.
- [ ] A show that was never opened behaves as it does today.
