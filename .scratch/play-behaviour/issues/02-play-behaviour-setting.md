# 02: Play behaviour setting replaces the Queue button

**What to build:** Episode rows keep only the PLAY button; the "Add to play queue" button goes from the episode tables and the play history. A new **Play behaviour** setting in the Playback section of Settings decides what PLAY does while another episode is playing:

- **Always ask** (default): a dialog asks whether to PLAY or QUEUE the episode. QUEUE is the default (focused) answer; dismissing does nothing.
- **Always play**: plays the clicked episode instead of the current one. The play queue stays as-is.
- **Always queue**: appends the episode to the play queue.

When nothing is playing (player empty or paused), or the clicked episode is the one already playing, PLAY just plays, whatever the setting.

**Blocked by:** 01 (Confirm dialog can offer a second answer).

**Status:** ready-for-agent

- [ ] The setting is stored with the other settings, defaults to Always ask, and survives a restart
- [ ] Backend test: settings without the field load as Always ask
- [ ] Settings view has a Play behaviour select in Playback, saving like the other menus
- [ ] The "Add to play queue" button is gone from the episode tables and the play history
- [ ] PLAY follows the setting while another episode plays, and always plays when idle or on the current episode
- [ ] Always ask: dialog focuses QUEUE; PLAY plays, QUEUE enqueues, Esc / `[×]` changes nothing
- [ ] Player tests cover each mode, the dialog's answers, and the idle case
