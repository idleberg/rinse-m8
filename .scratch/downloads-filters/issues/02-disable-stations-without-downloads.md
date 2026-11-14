# 02: Disable checkboxes for stations with no downloads

**What to build:** On Downloads, a station's checkbox is disabled when that station has no episodes in Previous Downloads or the active queue. The queue counts as well as the history because the filters are shared across views. A station unchecked elsewhere could otherwise hide a queued episode behind a checkbox that can't be ticked on this page. Other views keep every station checkbox enabled.

**Blocked by:** 01: Search and station filters on Downloads

**Status:** resolved

- [x] A station with nothing queued, running, failed or previously downloaded has a disabled checkbox on Downloads
- [x] A station with only a queued download has an enabled checkbox
- [x] The dashboard, schedule, show directory and FAVS keep every station checkbox enabled
