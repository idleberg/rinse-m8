# 23: Download queue view

**What to build:** The download footer shrinks to a progress bar with the percentage printed, the number of items in the download queue, and a "VIEW QUEUE" button. That button, and a new Queue tab in the nav, open the **queue view**: a table with the current download and its progress at the top, then every waiting download with a button to remove it, and the last failed download with a dismiss button. The running download can't be removed, since cancelling isn't supported.

**Blocked by:** 19 (Views as tabs)

**Status:** ready-for-agent

- [ ] The footer shows a progress bar with the percentage and the number of queued items while something downloads
- [ ] "VIEW QUEUE" in the footer and the Queue tab in the nav open the queue view
- [ ] The queue view lists the current download with its progress, then the waiting downloads in order
- [ ] A waiting download can be removed; the removal is saved and survives a restart
- [ ] The running download has no remove control
- [ ] A failed download shows in the footer and the queue view with a way to dismiss it
- [ ] Unit test: removing a waiting download drops only that one; removing an unknown or running one changes nothing
- [ ] GLOSSARY.md defines **Queue view**
