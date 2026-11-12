# 06: Copy download link

**What to build:** Every flyout ends with a default section below a divider, holding COPY DOWNLOAD LINK. It puts the episode's mp3 URL on the clipboard and closes the flyout, with no other feedback. It's disabled for an episode without an mp3, and stays enabled after a 404, since the link is still the link. Tables that get their flyout later pick the section up without extra work.

**Blocked by:** 01

**Status:** ready-for-agent

- [x] Every flyout ends with a divider and COPY DOWNLOAD LINK
- [x] Choosing it puts the mp3 URL on the clipboard and closes the flyout
- [x] It's disabled for an episode without an mp3 and enabled for one whose mp3 got a 404
- [ ] Works in the macOS, Windows and Linux webviews
