# 78: Love episodes in the app

**What to build:** A heart button sits at the end of the controls row, both in the player bar and on the Player tab, where it follows the repeat button at the same height. It's always there, whether or not a Last.fm account is connected. It's an outline (in the ink colour) when the playing episode isn't loved, and filled with the accent red when it is. Clicking it loves or unloves the episode, and the heart changes at once. Loved episodes are stored by the app in its own store, so they survive a restart and don't depend on the episode cache. Last.fm is never read for the loved state; ticket 79 sends loves to Last.fm. The button reports its state to assistive tech as pressed or not pressed, and its tooltip reads "Love" or "Unlove".

**Blocked by:** None (can start immediately)

**Status:** ready-for-human (needs a look in the app: heart in both layouts and themes, loving and unloving, still loved after a restart)

- [x] The heart shows at the end of the controls row in the player bar and on the Player tab, connected to Last.fm or not.
- [x] Clicking an unloved heart fills it red; clicking a loved heart empties it.
- [ ] The loved state follows the playing episode when it changes, including the episode restored at launch.
- [x] Loved episodes are still loved after restarting the app.
- [x] The button has `aria-pressed` set to the loved state, and its title reads Love or Unlove.

## Comments

- Loved episode ids are saved in `player.json` under `loved`, next to the queue and last-played episode.
- The loved heart keeps the unpressed button look and only fills red; the global `aria-pressed` style would otherwise invert the whole button.
- Every box above is an in-app check that hasn't been run yet: both layouts, both themes, and a restart.
