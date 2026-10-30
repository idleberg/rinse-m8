# 17: Persist the download queue

**What to build:** The download queue survives quitting the app. At launch it starts again by itself, beginning with the item that was in progress, which resumes from its `.part` file. Each item keeps the download folder it was queued with, so changing the folder later doesn't move pending downloads. Queued auto-downloads are therefore no longer lost when the app quits.

**Blocked by:** 16 (Resumable downloads)

**Status:** ready-for-agent

- [ ] The download queue, including the item in progress, is saved to disk whenever it changes
- [ ] Each item records the download folder it was queued with
- [ ] At launch the saved download queue starts again by itself, resuming the first item
- [ ] The `ponytail:` comment about failed auto-downloads not being retried is updated to reflect that queued auto-downloads now survive restarts
- [ ] Manual check: queue three downloads, quit during the first, relaunch; the first resumes and the other two follow
