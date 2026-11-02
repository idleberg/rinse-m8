# 65: Tab layout for the Player tab's controls

**What to build:** A prefactor ahead of tickets 66–68. The Player tab gets its own layout of the shared player controls, while the bottom bar stays as it is.

- The episode label moves to a line of its own, below the controls row.
- The time counter reads elapsed or remaining time, then the episode's full length, e.g. `0:12:00 / 1:00:00`. The toggle still switches only the first part.

Both sets of controls are still driven by the same props from the player, so they stay in sync.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] On the Player tab, the label sits below the controls row
- [x] On the Player tab, the counter shows the full length after the elapsed/remaining time
- [x] The bottom bar looks and behaves as before, with no total length
- [x] Play, pause, seek and the time toggle on the tab and in the bar stay in sync
