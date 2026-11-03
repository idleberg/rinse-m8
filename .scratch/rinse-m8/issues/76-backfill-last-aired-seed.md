# 76: Backfill seed of last aired dates

**What to build:** A checked-in seed of every show's last aired date, so users don't start from zero. An opt-in dev command (it doesn't run in the normal test suite) walks the show directory, fetches each show's page one at a time with a short pause between requests, and writes a `slug → YYYY-MM-DD` file sorted by slug for clean diffs. It reuses the app's own episode date mapping (London dates) so seed dates match recorded ones. The file is bundled into the app. It's only read, never written to the user's store, so each release's seed applies in full.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] One documented command regenerates the seed file.
- [x] Requests are throttled; a failed show is skipped and reported rather than aborting the walk.
- [x] The seed is bundled into the app and readable at runtime.
- [x] Spot-checked dates for a few shows match rinse.fm.
