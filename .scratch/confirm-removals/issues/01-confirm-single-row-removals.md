# 01: Confirm single-row removals

**What to build:** Every destructive action asks first. The Clear actions and Unsubscribe already do, but removing a single row doesn't: Remove in the play queue, Remove in the download queue (waiting and failed rows) and Remove in previous downloads. Each gets a confirmation naming the episode, in the style of the existing dialogs. Cancelling a running download is out of scope unless decided otherwise.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Remove in the play queue asks first and removes only that entry once confirmed
- [ ] Remove on a waiting or failed download asks first
- [ ] Remove in previous downloads asks first
- [ ] Declining any of them leaves the row as it was
