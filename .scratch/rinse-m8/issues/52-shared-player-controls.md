# 52: Shared player controls

**What to build:** A prefactor ahead of the Player tab. The bottom bar's controls move into a component of their own, which the Player tab will reuse:

- play/pause
- the episode label
- the seek bar
- the elapsed/remaining time toggle

The player still owns the single audio element and the player state store. It exposes the current episode, paused state, playhead, duration and the remaining-time preference, so a second set of controls can show the same state. Nothing changes for the user.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The bottom bar looks and behaves as before: play, pause, seek, time toggle, resume at launch, Last.fm now playing and scrobbling
- [ ] The controls are one reusable component, driven entirely by the props the player exposes
- [ ] The remaining-time preference is held in one place, so two sets of controls can't disagree
