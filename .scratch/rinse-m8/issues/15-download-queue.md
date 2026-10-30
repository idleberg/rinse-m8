# 15: Download queue with progress

**What to build:** Every download, whether started by a click or by auto-download, goes into one download queue that the backend works through strictly one at a time, in the order they arrived. Rinse penalises parallel downloads, so nothing may ever download two files at once. Each row's `DownloadButton` shows "Queued", the percent while downloading, or "Failed", and does nothing while its episode is in the download queue. A sticky `DownloadStatus` footer appears only while there's something to report: the current file ("<Show> – <dd/mm>"), its percent and how many are queued, or "Failed: <Show> – <dd/mm>" until the next download starts or it's dismissed. A failed item leaves the download queue and the next one starts; there's no automatic retry. The download queue lives in memory for now.

**Blocked by:** 11 (Split the page into components)

**Status:** ready-for-agent

- [ ] The backend owns a single download queue that runs one download at a time, first in, first out
- [ ] Clicking download adds the episode to the download queue; clicking an episode that's already queued or downloading does nothing
- [ ] The background check adds auto-downloads to the same download queue instead of downloading them itself
- [ ] The backend reports queue changes and download progress to the frontend
- [ ] `DownloadButton` shows Queued / percent / Failed and is used in every `EpisodeTable`
- [ ] `DownloadStatus` is a sticky footer that's hidden when idle and shows the current file, percent and queued count, or the last failure until it's dismissed or the next download starts
- [ ] A failed download doesn't stop the download queue
- [ ] Manual check: click download on three episodes quickly; they download one after another, never at the same time, and the footer counts down
