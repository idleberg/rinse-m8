# 01: Confirm dialog can offer a second answer

**What to build:** The confirm dialog asks with two named actions, a primary and a secondary, so a question can have two real answers (e.g. PLAY and QUEUE). The dialog has no built-in Cancel: the secondary button is focused when the dialog opens, so it is the default answer, and `[×]` and Esc are the only ways to dismiss without choosing either. Existing yes/no confirmations (Unsubscribe, Disconnect, Clear Queue, Clear History, Clear Downloads, Clear Image Cache) pass Cancel as their secondary action and behave exactly as before.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] A question carries a `primaryAction` and a `secondaryAction` label; the dialog has no Cancel button of its own
- [x] The secondary button is focused when the dialog opens
- [x] The caller can tell apart: primary chosen, secondary chosen, dismissed (Esc / `[×]`)
- [x] Existing `confirm()` callers pass `secondaryAction: 'Cancel'` and keep resolving `true` (primary) / `false` (anything else)
- [x] Unit test: choosing the secondary action resolves as secondary; dismissing resolves as neither
