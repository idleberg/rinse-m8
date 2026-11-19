# 03: Subscribing asks about auto-download

**What to build:** Subscribing follows the Auto-downloads setting from 01:

- **Off:** subscribing only subscribes. No dialog.
- **Selected shows:** a dialog like the Play/Queue one (`choose()`, as `player.playOrQueue` uses it) asks whether to SUBSCRIBE or SUBSCRIBE WITH DOWNLOAD. SUBSCRIBE subscribes. SUBSCRIBE WITH DOWNLOAD subscribes and enables the show's auto-download from 02. Closing the dialog with Esc or `[×]` does neither.
- **All subscribed shows:** subscribing also enables the show's auto-download, without a dialog. The show then keeps auto-downloading if the mode later changes to Selected shows.

SUBSCRIBE WITH DOWNLOAD asks for a download folder first if none is set and there's no default one (see 04), just like enabling it from the flyout in 02. If that folder dialog is cancelled, the show is still subscribed, with auto-download left disabled.

Only a subscribe the user starts asks. Importing subscriptions and UNDO after an unsubscribe neither ask nor change any auto-download flags. UNDO restores the show's flag as it was, as 02 requires.

**Blocked by:** 02: Per-show auto-download from the show's flyout

**Status:** ready-for-agent

- [ ] With Off, subscribing shows no dialog and leaves the show's auto-download flag unchanged
- [ ] With Selected shows, subscribing opens a dialog offering SUBSCRIBE and SUBSCRIBE WITH DOWNLOAD
- [ ] SUBSCRIBE subscribes without enabling auto-download; SUBSCRIBE WITH DOWNLOAD subscribes and enables it
- [ ] Closing the dialog without choosing leaves the show unsubscribed
- [ ] SUBSCRIBE WITH DOWNLOAD with no download folder and no default asks for one; cancelling still subscribes, with auto-download disabled
- [ ] With All subscribed shows, subscribing enables the show's auto-download with no dialog
- [ ] Importing subscriptions and UNDO after an unsubscribe never open the dialog
- [ ] Tests cover subscribing in each mode, closing the dialog without choosing, and the cancelled folder dialog
