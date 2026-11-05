# 02: Last updated show order

**What to build:** The "Show order" menu gets a third choice, Last updated. The Dashboard's show sections are sorted by their newest episode, the section with the newest episode first. Only the episodes a section actually shows count, after the filters and the "show downloaded" checkbox, so the order matches what's on screen.

**Blocked by:** 01 (Show order setting with alphabetical sorting)

**Status:** done

- [x] The "Show order" menu offers Last updated, and the choice is saved and survives a restart
- [x] With Last updated, the section whose newest visible episode is newest (by date and time) comes first
- [x] Changing a filter or "show downloaded" re-sorts the sections to match the episodes now shown
- [x] The Latest table stays first, and the episode order inside each section is unchanged
