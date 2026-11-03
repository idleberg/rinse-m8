# 79: Love on Last.fm too

**What to build:** When an episode is loved in the app and a Last.fm account is connected, the episode is also loved on Last.fm with `track.love`, sending the same artist and track names that scrobbling sends. Unloving in the app doesn't touch Last.fm: there's no `track.unlove`, so a track stays loved on the Last.fm profile. Without an account or an API key, loving only changes the app. A failed call doesn't change the heart, since the app's state stays the source of truth; the failure is logged the way a failed scrobble is, and there's no retry. If Last.fm rejects the session, the account is disconnected the same way it is for scrobbling.

**Blocked by:** 78 (Love episodes in the app)

**Status:** ready-for-human (needs a check against a real Last.fm account: loving, unloving, and a revoked session)

- [ ] Loving an episode while connected loves it on the Last.fm profile.
- [x] Unloving an episode leaves it loved on Last.fm.
- [x] Loving while disconnected or without an API key makes no Last.fm call.
- [ ] A failed call is logged and leaves the heart loved.
- [ ] If Last.fm rejects the session, the account disconnects.

## Comments

- `track.love` gets only the artist and track names from `lastfm::track`, not the album or duration that scrobbles send.
- The `love` command reuses `lastfm_outcome`, so failures are logged and a rejected session disconnects exactly as for scrobbles.
- The unticked boxes need a real Last.fm account to check.
