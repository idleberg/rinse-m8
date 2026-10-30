# 23: Download queue view

**What to build:** The download footer shrinks to a progress bar with the percentage printed, the number of items in the download queue, and a "VIEW QUEUE" button. That button, and a new Queue tab in the nav, open the **queue view**: a table with the current download and its progress at the top, then every waiting download with a button to remove it, and the last failed download with a dismiss button. The running download can't be removed, since cancelling isn't supported.

**Blocked by:** 19 (Views as tabs)

**Status:** resolved

- [x] The footer shows a progress bar with the percentage and the number of queued items while something downloads
- [x] "VIEW QUEUE" in the footer and the Queue tab in the nav open the queue view
- [x] The queue view lists the current download with its progress, then the waiting downloads in order
- [ ] A waiting download can be removed; the removal is saved and survives a restart
- [x] The running download has no remove control
- [x] A failed download shows in the footer and the queue view with a way to dismiss it
- [x] Unit test: removing a waiting download drops only that one; removing an unknown or running one changes nothing
- [x] GLOSSARY.md defines **Queue view**

## Comments

- `DownloadQueue::remove` drops a waiting download by id and leaves the running one; the `remove_download` command saves through `update_downloads`, like every other queue change.
- The footer's progress bar carries the episode label as its accessible name; the visible text is only the percent, the queued count and "View queue".
- Left unticked: removal surviving a restart is covered by the existing save path but hasn't been checked in the running app.
