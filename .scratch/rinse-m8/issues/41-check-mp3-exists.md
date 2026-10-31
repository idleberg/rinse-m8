# 41: Hide episodes whose mp3 is missing

**What to build:** Rinse sometimes lists an mp3 before the file exists, misspells the link and fixes it later, or removes a file that used to work. The app checks each episode's mp3 with a HEAD request, which transfers no audio, and the "download available" filter shows only episodes whose file is really there.

- An episode under a month old is checked on every update, whatever the last result was. A misspelled link that Rinse fixes comes back, and a file that disappears is hidden.
- An episode over a month old is checked once if it has never been checked. After that it's checked again only when a download or playback of it fails.
- A 404 episode over a month old is dead: it's hidden from every table, even with the filter off.
- A network error or any status other than 200 or 404 counts as available, and the next update tries again.
- When Rinse changes an episode's mp3 link, the old result no longer applies and the new link is checked.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Each update sends a HEAD request for episode mp3s. Under a month old: checked on every update. Older: checked once if never checked.
- [x] "download available" hides 404 episodes, and they show no download or play buttons.
- [x] A 404 episode over a month old is hidden from every table, even with the filter off.
- [x] A network error or any other status counts as available, and the next update tries again.
- [x] A changed mp3 link throws away the old result and gets checked.
- [x] A failed download or playback rechecks the episode and records the result.
- [x] Notifications and auto-download fire only for available episodes, so a fixed episode notifies when it turns up.
- [x] Tests cover the check rules, the reset on a changed link, and the filter helpers. `cargo test`, `bun test` and `bun run check` pass.

## Comments

- The result is stored as `mp3Found` on each cached episode: `true` for a 200, `false` for a 404, null otherwise. Only the poller's update checks. Opening a show, the schedule fetch and subscribing don't, so a 404 shows up after the next update.
- Subscribing marks the show's available episodes as seen before any check runs. A missing mp3 among them won't notify when Rinse fixes it. Checking at subscribe time would cost about 30 HEAD requests per subscribe.
- HEAD requests time out after 10 seconds and run 8 at a time.
