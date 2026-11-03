# 75: Record each show's last aired date

**What to build:** A silent recorder. Whenever episodes are merged into the episode cache (schedule fetches and show refreshes), each show's record keeps the newest episode date seen for it, its **last aired** date. Nothing in the UI changes yet. The point is to start collecting data now so the staleness sort has local history behind it.

**Blocked by:** 74 (Cache show records)

**Status:** done

- [x] Merging episodes updates each affected show's last aired date to the newest date seen, and never moves it backwards.
- [x] Shows not in the merged episodes keep their record unchanged.
- [x] A unit test covers picking the newest date per show from a list of episodes.
