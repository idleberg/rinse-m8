# 43: Show "now playing" on Last.fm

**What to build:** While the user is connected to Last.fm, playing an episode sets "Scrobbling now" on their profile. Rinse has no tracklists, so the episode goes out as one track, using the pattern of the ID3 tags Rinse writes into its mp3s.

The tags themselves are typed by hand and inconsistent, and Rinse FR is mostly untagged, so they're never read. The fields are built from the episode:

- **artist:** the station, for example `Kool FM`
- **album:** the station plus ` Podcast`, for example `Kool FM Podcast`
- **track:** the show title, then the episode's display title if it has one, then ` - ` and the London date as `DD Month YYYY`. For example, `Amber's with Hutch - 30 October 2026`, or `Uncle Dugs - 30 October 2026`.
- **duration:** the episode's length

If Last.fm rejects the session, for example because the user revoked access, the app disconnects quietly.

**Blocked by:** 42

**Status:** ready-for-agent

- [ ] Playing an episode while connected shows it as "Scrobbling now" on Last.fm, with the artist, album and track above.
- [ ] A unit test covers the mapping for an episode with a display title and one without.
- [ ] Nothing is sent while disconnected.
- [ ] An invalid-session error disconnects, and the Settings row offers **Connect** again.
