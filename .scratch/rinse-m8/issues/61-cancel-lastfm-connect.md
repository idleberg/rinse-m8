# 61: Cancel connecting to Last.fm

**What to build:** While the Settings row reads "waiting for approval…", it also offers **Cancel**. If the user closed the approval page, the row is otherwise stuck until the polling gives up (100 × 3 s ≈ 5 min). Cancelling stops the polling immediately and the row offers **Connect** again. A cancel isn't an error: no error banner is shown.

**Blocked by:** 42 (Connect Last.fm in Settings)

**Status:** done

## Context

- `lastfm::connect` fetches a token, opens the approval page, then polls `auth.getSession` every 3 s for up to 100 rounds.
- The `connect_lastfm` command awaits it, stores the session in `lastfm.json` and returns the name.
- The frontend's `connectLastfm` sets `connectingLastfm` and awaits `invoke('connect_lastfm')`; `SettingsView` renders "waiting for approval…".
- Precedent: #27 cancels a download by signalling the worker and racing it with `tokio::select!`.

## Plan

1. **Backend cancel signal:** keep a managed state holding an optional `tokio::sync::oneshot` sender for the pending connect. `connect_lastfm` registers it before polling and clears it when done.
2. **Cancellable polling:** `connect` takes the cancel receiver and races each 3 s sleep (and the in-flight `call`) against it with `tokio::select!`. On cancel it returns a distinct outcome, not a string error. The token is simply abandoned.
3. **Command `cancel_lastfm_connect`:** fires the sender if present, no-op otherwise; register it next to `connect_lastfm`.
4. **Starting twice:** if `connect_lastfm` is called while one is pending, the old attempt is cancelled first so only one poll loop runs. Replacing the stored sender drops the old one, which already ends the old loop if a dropped sender counts as a cancel.
5. **`connect_lastfm` result:** on cancel, return a value the frontend can tell apart from failures (e.g. `None` = cancelled). Never store a session on cancel.
6. **Frontend:** `connectLastfm` treats the cancelled result as "not connected" with no error; add a cancel handler that invokes the new command and pass it to `SettingsView`.
7. **UI:** a **Cancel** button next to "waiting for approval…".
8. **Stuck-state safety:** when the window is hidden to the menu bar (#31) the app keeps running, so Cancel is the recovery path. Make sure `connectingLastfm` is always reset when the connect ends, however it ends.

## Acceptance criteria

- [x] While waiting, the row shows **Cancel** beside "waiting for approval…".
- [x] Clicking **Cancel** stops polling right away, and the row offers **Connect** again with no error banner.
- [x] After a cancel, approving the old token on Last.fm doesn't connect the app or write `lastfm.json`.
- [x] **Connect** after a cancel works normally (new token).
- [x] Calling connect while one is pending replaces the old attempt.
- [x] Timeout (#42) and Disconnect still behave as before.
- [x] Unit test: `connect` returns the cancelled outcome when the cancel signal fires mid-poll (inject the HTTP call or a short interval so the test doesn't wait 3 s).
- [x] Update #42's description of the waiting state to mention Cancel.
