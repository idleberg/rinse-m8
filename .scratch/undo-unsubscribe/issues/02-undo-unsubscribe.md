# 02: Undo an unsubscribe from a toast

**What to build:** UNSUBSCRIBE no longer asks first. It unsubscribes straight away and shows a toast reading "You unsubscribed from <show>" with an UNDO action. The toast stays up for about 5 seconds, long enough to reach the button. UNDO subscribes to the show again through the normal subscribe path, with the same busy state and error handling. The confirm dialog for unsubscribing goes.

Known limit: subscribing again adds the show to the end of the list, so it moves to the bottom when shows are sorted in the order they were subscribed. A backend change to keep its position is out of scope.

**Blocked by:** 01: Toasts can carry an action button

**Status:** ready-for-agent

- [x] Unsubscribing happens without a confirm dialog
- [x] A successful unsubscribe shows "You unsubscribed from <show>" with an UNDO action for about 5 seconds
- [x] A failed unsubscribe reports the error and shows no toast
- [x] UNDO subscribes to the show again
- [x] Tests cover unsubscribing without asking, the toast and its action, and undo subscribing again; the old confirm tests are removed
