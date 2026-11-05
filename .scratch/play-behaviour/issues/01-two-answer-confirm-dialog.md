# 01: Confirm dialog can offer a second answer

**What to build:** The confirm dialog can show a second answer in place of Cancel, so a question can have two real answers (e.g. QUEUE and PLAY). The alternative button takes Cancel's slot and its focus, so it is the default answer. Esc and `[×]` still dismiss without choosing either. Every existing yes/no confirmation (Unsubscribe, Clear Queue, Clear History, Clear Image Cache) behaves exactly as before.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] A question can carry an optional alternative label; without one the dialog shows Cancel as today
- [x] With an alternative, its button replaces Cancel and is focused when the dialog opens
- [x] The caller can tell apart: action chosen, alternative chosen, dismissed (Esc / `[×]`)
- [x] Existing `confirm()` callers keep resolving `true`/`false` unchanged
- [x] Unit test: choosing the alternative resolves as the alternative; dismissing resolves as neither
