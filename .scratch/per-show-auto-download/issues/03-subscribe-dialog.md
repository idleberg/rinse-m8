# 03: Subscribing asks about auto-download

**What to build:** Subscribing follows the Auto-downloads setting from 01:

- **Off:** subscribing only subscribes. No dialog.
- **Selected shows:** a dialog like the Play/Queue one (`choose()`, as `player.playOrQueue` uses it) asks whether to ONLY SUBSCRIBE or ALSO DOWNLOAD. ONLY SUBSCRIBE subscribes. ALSO DOWNLOAD subscribes and enables the show's auto-download from 02. Closing the dialog with Esc or `[×]` does neither.
- **All subscribed shows:** subscribing also enables the show's auto-download, without a dialog. The show then keeps auto-downloading if the mode later changes to Selected shows.

ALSO DOWNLOAD asks for a download folder first if none is set and there's no default one (see 04), just like enabling it from the flyout in 02. If that folder dialog is cancelled, the show is still subscribed, with auto-download left disabled.

Only a subscribe the user starts asks. Importing subscriptions and UNDO after an unsubscribe neither ask nor change any auto-download flags. UNDO restores the show's flag as it was, as 02 requires.

**Blocked by:** 02: Per-show auto-download from the show's flyout

**Status:** ready-for-agent

- [x] With Off, subscribing shows no dialog and leaves the show's auto-download flag unchanged
- [x] With Selected shows, subscribing opens a dialog offering ONLY SUBSCRIBE and ALSO DOWNLOAD
- [x] ONLY SUBSCRIBE subscribes without enabling auto-download; ALSO DOWNLOAD subscribes and enables it
- [x] Closing the dialog without choosing leaves the show unsubscribed
- [x] ALSO DOWNLOAD with no download folder and no default asks for one; cancelling still subscribes, with auto-download disabled
- [x] With All subscribed shows, subscribing enables the show's auto-download with no dialog
- [x] Importing subscriptions and UNDO after an unsubscribe never open the dialog
- [x] Tests cover subscribing in each mode, closing the dialog without choosing, and the cancelled folder dialog
