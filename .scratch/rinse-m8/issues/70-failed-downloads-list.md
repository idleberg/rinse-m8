# 01: Keep failed downloads in a list

**What to build:** Every download that fails stays in the Active Downloads table until the user acts on it, instead of only the last failure being remembered until the next download starts. Failed rows are marked as failed and have two actions: Retry and Remove (x). The queue ignores failed entries and goes on with the next waiting download; a failed entry only downloads again when the user retries it. Retry puts the entry at the front of the waiting downloads, with the folder it was first queued with. Remove drops the entry and deletes its partial file. Failures survive a restart. Clicking an episode's "Failed" button in the episode tables retries that entry rather than queueing a duplicate. When nothing is downloading, the footer bar shows "Failed: <episode>" for one failure or "<n> downloads failed" for several, with only a View queue button. The old single-failure Dismiss action goes away.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] A failed download appears as a failed row in Active Downloads, and the next waiting download starts
- [x] Several failures are all listed, in the order they failed, and none is downloaded again on its own
- [x] Retry moves the entry to the front of the waiting downloads and wakes the queue
- [x] Remove (x) drops the entry and deletes its `.part` file; a missing `.part` is not an error
- [x] The episode table's "Failed" button retries the entry instead of adding a second one
- [x] Failures are still listed after a restart and are not started automatically
- [x] A queue saved by the previous version, with its single failure, still loads with its waiting downloads and downloaded record intact (the failures are saved under a new key, so the old one is ignored)
- [x] The footer bar shows "Failed: <episode>" or "<n> downloads failed" with a View queue button when nothing is downloading
- [x] Queue unit tests cover failing, skipping failures, retrying to the front, removing, and pushing a failed episode
- [x] `cargo test` and `bun run check` pass

## Comments

- `DownloadQueue.failures` replaces `failed`; `remove` now drops waiting or failed entries and returns them, and the `remove_download` command deletes the `.part` of either. `push` of a failed episode retries it in its original folder.
- Changed after review: the episode tables no longer show a "Failed" button. A failed episode's row is drawn in the accent colour (text, button outlines and icons), and its normal download button, labelled "Retry", retries it and opens the downloads view.
