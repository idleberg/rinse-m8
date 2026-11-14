# 01: Search and station filters on Downloads

**What to build:** Downloads gets the shared search box and station checkboxes, the same ones the dashboard, schedule and FAVS use. They narrow both sections at once: the active queue (current, waiting and failed downloads) and Previous Downloads. Only the station checkboxes and the search apply. The "download available" and "hide rebroadcasts" checkboxes don't, as on FAVS.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The search box and station checkboxes show at the top of Downloads, and stay in sync with the other views because they share the same state
- [ ] Searching or unchecking a station narrows the current, waiting and failed downloads and Previous Downloads
- [ ] Dragging a waiting download or moving it with Alt+Arrow while filtering moves it to the right place in the full queue, not its position in the filtered list
- [ ] A section whose list has entries but none that pass the filters says "No downloads match the filters". An empty list keeps its current message
- [ ] Retry All and Clear Downloads still act on every download, filtered or not
