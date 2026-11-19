# 02: Per-show auto-download from the show's flyout

**What to build:** Each show's flyout gets an "Enable auto-download" entry, which reads "Disable auto-download" once the show is enabled. The entry works only for a subscribed show while the mode is Selected shows. Only subscribed shows are polled, so a flag on any other show would do nothing. In every other case, the entry is disabled and a tooltip says why: the show isn't subscribed, all subscribed shows already auto-download, or auto-download is off.

Enabling asks for a download folder first if none is set and there's no default one (see 04). A cancelled folder dialog leaves the show disabled. While the mode is Selected shows, new episodes of enabled shows go into the download queue. A notification offers Download only when its show isn't auto-downloaded.

The enabled shows are kept apart from the subscriptions, the same way seen episodes are. This keeps them through an unsubscribe and its UNDO, and leaves the import/export file format unchanged. Exported files don't carry the flags. Enabling never downloads episodes the app has already seen, only ones that arrive later.

**Blocked by:** 01: Auto-downloads setting replaces the toggle

**Status:** ready-for-agent

- [x] A subscribed show's flyout offers "Enable auto-download" while the mode is Selected shows, and "Disable auto-download" once it's enabled
- [x] The entry is disabled, with a tooltip saying why, for unsubscribed shows and in the Off and All subscribed shows modes
- [x] Enabling with no download folder and no default asks for one; cancelling leaves the show disabled
- [x] With Selected shows, new episodes of enabled shows are queued and new episodes of other subscribed shows are not
- [x] A notification offers Download only for episodes whose show isn't auto-downloaded
- [x] Unsubscribing and then using UNDO keeps the show's auto-download flag
- [x] Exporting and importing subscriptions use the same file format as before
- [x] Tests cover deciding auto-download per show in each mode, the flag surviving an unsubscribe, and the flyout entry's states
