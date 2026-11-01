# 59: Confirm before clearing previous downloads

**What to build:** "Clear Downloads" in the queue view asks first, using the confirm dialog from ticket 58, e.g. "Clear the list of previous downloads?" with Cancel and Clear.

**Blocked by:** 58: Confirm before unsubscribing

**Status:** done

- [x] "Clear Downloads" opens the dialog and the list stays as it is until confirmed
- [x] Clear in the dialog clears it; Cancel, `[×]` and Esc change nothing

## Comments

- Wired in the `QueueView` `onclear` handler in `+page.svelte`.
