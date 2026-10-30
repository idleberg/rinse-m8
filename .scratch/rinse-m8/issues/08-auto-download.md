# 08: Auto-download

**What to build:** A setting that, when enabled, makes the background check download every new subscribed episode to the download folder in addition to notifying.

**Blocked by:** 04 (Download an episode), 07 (New-episode notifications)

**Status:** ready-for-agent

- [x] The settings store has an auto-download flag, and the UI has a toggle for it
- [x] When the flag is on and a download folder is set, the poller downloads each new episode using the same streaming and naming as manual download
- [x] When the flag is on but no folder is set, it still notifies but skips downloading; it never opens a dialog from the background
- [ ] Manual check: with the flag on, the step from 07's manual check also puts the mp3 in the folder
