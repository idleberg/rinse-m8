# 03: Downloads module

**What to build:** The download queue and every download command move into a `downloads` rune module: queueing (asking for a download folder first when none is set), cancel, retry, retry all, reorder, remove, mark and unmark as downloaded, clear previous downloads, and the live `download-queue` updates. The download queue view, the download status bar and the download buttons read the module directly, so the download props and callbacks drilled through the page, show sections, show view and episode tables go away.

**Blocked by:** 02 (Errors and confirm modules, init pattern, ADR)

**Status:** ready-for-agent

- [ ] Queueing, cancelling, retrying (one and all), reordering, removing, marking and unmarking downloads work as before
- [ ] A retried failure still opens the download queue view
- [ ] The download status bar and the "show downloaded" dashboard toggle still reflect the queue
- [ ] No component receives the download queue or download callbacks as props
- [ ] `bun test` and `svelte-check` pass
