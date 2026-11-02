# 63: Import subscriptions

**What to build:** **Import…** in the **Show data** row opens a file dialog (JSON filter) and **merges** the file's shows into the user's subscriptions. Shows already subscribed are skipped, and nothing gets unsubscribed. Each new show goes through the normal subscribe flow: the show is fetched, its already available episodes are marked as seen, and the dashboard updates. Importing therefore never floods notifications. Both buttons are disabled while an import runs.

The file follows the contract defined in #62. Import rejects a file with a missing `version`, or with a major version other than `1`, and the error banner names the version it found. If a show fails to fetch, the import stops and the error names that show. Shows imported before it stay subscribed, and because the import merges, running it again is safe.

**Blocked by:** 62 (Export subscriptions)

**Status:** done

- [x] Importing a file exported by #62 restores its shows and keeps any other existing subscriptions.
- [x] Shows already subscribed are skipped. They aren't fetched again or duplicated.
- [x] Newly imported shows trigger no notifications for episodes that are already available.
- [x] A file with `"version": 2`, with no `version`, or that isn't valid JSON is rejected with an error banner, and nothing is subscribed.
- [x] Cancelling the open dialog does nothing.
- [x] **Import…** and **Export…** are disabled while an import runs.
- [x] Unit tests: an unsupported or missing major version is rejected, and unknown extra fields are accepted.
