# 79: Toggle love from the heart

**What to build:** Clicking the heart loves the playing episode on Last.fm (`track.love`), or unloves it if it's already loved (`track.unlove`). The heart changes as soon as it's clicked. If the call fails, for example while offline, the heart goes back to its previous state and the error banner shows the failure; it isn't only logged the way a failed scrobble is. If Last.fm rejects the session, the account is disconnected the same way it is for scrobbling. The button reports its state to assistive tech as pressed or not pressed, and its tooltip reads "Love" or "Unlove".

**Blocked by:** 78 (Show whether the playing episode is loved)

**Status:** ready-for-agent

- [ ] Clicking an unloved heart fills it, and the episode shows as loved on the Last.fm profile.
- [ ] Clicking a loved heart empties it, and the episode is no longer loved on Last.fm.
- [ ] A failed call puts the heart back and shows the error banner.
- [ ] If Last.fm rejects the session, the account disconnects and the heart disappears.
- [ ] The button has `aria-pressed` set to the loved state, and its title reads Love or Unlove.
