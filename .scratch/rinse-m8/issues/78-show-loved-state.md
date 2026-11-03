# 78: Show whether the playing episode is loved

**What to build:** When a Last.fm account is connected, a heart button sits to the right of the episode title, both in the player bar and on the Player tab. It's an outline (in the ink colour) when the episode isn't loved on Last.fm, and filled with the accent red when it is. Each time the episode changes, including the episode restored at launch, the loved state is read from Last.fm with `track.getInfo` and the connected `username`. Send the same artist and track names that scrobbling sends, with autocorrect off. When no account is connected, the build has no API key, or the lookup fails, there's no heart. An episode Last.fm has never seen ("Track not found") counts as unloved. If Last.fm rejects the session, the account is disconnected the same way it is for scrobbling. Clicking the heart does nothing yet; ticket 79 adds that.

**Blocked by:** None (can start immediately)

**Status:** ready-for-human (needs a look in the app with a connected account: heart in both layouts and themes, loved vs unloved episode)

- [ ] While connected, the heart shows next to the title in the player bar and on the Player tab.
- [ ] The heart is filled red for an episode loved on Last.fm, and an outline otherwise.
- [ ] An episode unknown to Last.fm shows as unloved.
- [ ] The state is read again when the episode changes, and a slow reply for the previous episode doesn't apply to the next one.
- [ ] The episode restored at launch shows its state.
- [ ] There's no heart while disconnected, without an API key, or after a failed lookup.
- [ ] Disconnecting in Settings, or Last.fm rejecting the session, hides the heart immediately.
- [x] Unit tests turn a `track.getInfo` reply into the loved state: loved, not loved, and Track not found.
