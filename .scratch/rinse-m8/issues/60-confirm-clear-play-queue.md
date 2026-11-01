# 60: Confirm before clearing the play queue

**What to build:** "Clear Queue" on the player tab asks first, using the confirm dialog from ticket 58, e.g. "Clear the play queue?" with Cancel and Clear.

**Blocked by:** 58: Confirm before unsubscribing

**Status:** done

- [x] "Clear Queue" opens the dialog and the play queue stays as it is until confirmed
- [x] Clear in the dialog clears it; Cancel, `[×]` and Esc change nothing

## Comments

- Wired in the `PlayerView` `onclear` handler in `+page.svelte`.
