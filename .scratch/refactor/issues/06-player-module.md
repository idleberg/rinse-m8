# 06: Player module

**What to build:** Playback state moves into a `player` rune module: the current episode, paused state, times, remaining-time toggle, repeat, the play queue, loves, the session history for PREV, position saving and resume, and Last.fm now-playing and scrobbling, with `play`, `pause`, `enqueue`, `dequeue`, `move`, `clearQueue`, `playFromQueue`, `skip` and `previous`. The player component keeps only the `<audio>` element and its media event handlers, handing the element to the module. Player controls, the player view and the episode tables' play/pause/enqueue buttons call the module directly, so the `controls` getter object, `bind:this`, `bind:playing` and `bind:queue` go away. The tray play/pause item and the tray "playing" state follow the module.

**Blocked by:** 05 (Episodes, filters and directory modules), as the player looks up the episode cache at launch

**Status:** done

- [ ] Play, pause, seek, PREV/NEXT, repeat modes and love work as before, from both the player bar and the player view
- [ ] The last-played episode and its position come back after a restart
- [x] The play queue persists, reorders, clears (with confirmation) and plays through as before
- [ ] Now-playing and scrobbling to Last.fm still happen
- [ ] The tray play/pause item works and the tray reflects playback
- [x] No component reaches the player through `bind:this` or a `controls` object
- [x] `bun test` and `svelte-check` pass

## Comments

- Unit-tested in `src/lib/player.test.ts`: launch restore, NEXT under repeat all, PREV (back and restart), queue persistence, clear with confirmation, love. The unticked boxes need a run of the app: audio, restart position, Last.fm and tray.
- `player.playing` is now derived from `paused`. When you switch episodes mid-play, the row's pause button and the tray follow the new episode right away instead of waiting for its `play` event.
- `init()` runs its effects in `$effect.root`, so they don't need a component and can be tested.
