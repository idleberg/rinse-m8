# 21: Hide downloaded episodes

**What to build:** The app remembers which episodes finished downloading, across restarts. The dashboard omits downloaded episodes by default, with a "show downloaded" toggle to bring them back. An episode counts as downloaded only once its download completes successfully in the app; files downloaded before this change don't count.

**Blocked by:** 20 (Dashboard groups episodes by show)

**Status:** ready-for-human

- [x] A successfully finished download is recorded as downloaded and kept across restarts; a failed one isn't
- [x] The frontend learns about downloaded episodes from the same updates it already gets for the download queue
- [x] The dashboard hides downloaded episodes unless "show downloaded" is ticked
- [x] The download button of a downloaded episode shows a check icon
- [x] Unit test: finishing a download successfully records it, failing doesn't
- [ ] Manual check: download an episode, watch it disappear from the dashboard, tick "show downloaded" and see it back with a check
