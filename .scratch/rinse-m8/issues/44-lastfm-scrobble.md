# 44: Scrobble listened episodes

**What to build:** While the user is connected, an episode is scrobbled once they've actually heard half of it or 4 minutes of it, whichever comes first. The scrobble carries the time the episode started playing and uses the same fields as "now playing".

Only time actually heard counts: seeking forward or back adds nothing. Each episode is scrobbled once per time it's played, and playing another episode starts the count over. A scrobble that fails isn't retried.

**Blocked by:** 43

**Status:** ready-for-agent

- [ ] After 4 minutes of playback, the episode appears in the user's Last.fm scrobbles, stamped with the time it started.
- [ ] Seeking ahead doesn't trigger a scrobble early.
- [ ] Pausing and resuming the same episode doesn't scrobble it a second time.
- [ ] Nothing is sent while disconnected.
