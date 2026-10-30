# 38: Mark an episode as downloaded

**What to build:** On the dashboard, an episode that isn't downloaded or in the download queue gets a button with a × icon next to its download button. Clicking it records the episode as downloaded without downloading it, for files fetched before or outside the app. The episode then leaves the dashboard like any downloaded one. Marking goes through the same downloaded record and `download-queue` updates as a finished download. The show view and the schedule don't get the button.

**Blocked by:** 21 (Hide downloaded episodes)

**Status:** ready-for-human

- [x] Dashboard episodes that aren't downloaded, queued, downloading or failed show a × button labelled "Mark as downloaded"; a downloaded one shows it disabled
- [x] Clicking it records the episode as downloaded, and the episode disappears from the dashboard
- [x] With "show downloaded" ticked, a marked episode shows the check icon like a downloaded one
- [x] A marked episode stays marked across restarts
- [x] The show view and the schedule have no × button
- [x] A failed mark reports the error
- [ ] Manual check: mark an episode, watch it disappear, tick "show downloaded" and see it back with a check, then restart and see it still marked
