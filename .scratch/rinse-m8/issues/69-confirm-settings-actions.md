# 69: Confirm destructive settings actions

**What to build:** Clearing the image cache and disconnecting Last.fm in Settings ask first, using the same confirm dialog as unsubscribe and clearing the queue. Cancel does nothing; confirming does what the button did before.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Clicking "Clear" next to the image cache opens a "Clear Image Cache" dialog with a "Clear" action
- [x] Cancelling it leaves the cache and its shown size unchanged
- [x] Clicking "Disconnect" opens a "Disconnect Last.fm" dialog that names the connected user, with a "Disconnect" action
- [x] Cancelling it keeps the Last.fm connection
