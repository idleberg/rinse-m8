# 06: Player module

**What to build:** Playback state moves into a `player` rune module: the current episode, paused state, times, remaining-time toggle, repeat, the play queue, loves, the session history for PREV, position saving and resume, and Last.fm now-playing and scrobbling, with `play`, `pause`, `enqueue`, `dequeue`, `move`, `clearQueue`, `playFromQueue`, `skip` and `previous`. The player component keeps only the `<audio>` element and its media event handlers, handing the element to the module. Player controls, the player view and the episode tables' play/pause/enqueue buttons call the module directly, so the `controls` getter object, `bind:this`, `bind:playing` and `bind:queue` go away. The tray play/pause item and the tray "playing" state follow the module.

**Blocked by:** 05 (Episodes, filters and directory modules), as the player looks up the episode cache at launch

**Status:** ready-for-agent

- [ ] Play, pause, seek, PREV/NEXT, repeat modes and love work as before, from both the player bar and the player view
- [ ] The last-played episode and its position come back after a restart
- [ ] The play queue persists, reorders, clears (with confirmation) and plays through as before
- [ ] Now-playing and scrobbling to Last.fm still happen
- [ ] The tray play/pause item works and the tray reflects playback
- [ ] No component reaches the player through `bind:this` or a `controls` object
- [ ] `bun test` and `svelte-check` pass
