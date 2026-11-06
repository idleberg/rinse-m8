# 02: Recommended shows in the show view

**What to build:** below a show's episodes, the show view lists recommended shows for that show's title, best first. Opening the show view while connected to Last.fm starts the lookup if the cache has nothing fresh. The list fills in when the lookup finishes and doesn't hold up the episodes. Clicking a recommended show opens its show view. While disconnected, or when nothing matches, the section is left out.

**Blocked by:** 01

**Status:** ready-for-human (needs a check in the app with a connected Last.fm account: the list, a click, a cached reopen, and one while disconnected)

- [ ] A show with matches lists its recommended shows below its episodes, best first
- [ ] The episodes appear without waiting for the lookup
- [ ] Clicking a recommended show opens its show view
- [ ] No section appears while disconnected or when nothing matches
- [ ] Reopening the show within 30 days uses the cache
