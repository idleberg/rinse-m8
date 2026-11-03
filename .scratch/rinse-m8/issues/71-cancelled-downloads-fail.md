# 02: Cancelled downloads join the failed list

**What to build:** Cancelling the running download no longer makes it vanish. It moves into the failed list from 01 with Retry and Remove (x), and the queue goes on with the next waiting download. Its partial file is kept, so Retry resumes where it stopped; Remove deletes it.

**Blocked by:** 01 (Keep failed downloads in a list)

**Status:** done

- [x] Cancelling the running download (from Active Downloads or the footer bar) lists it as failed, and the next waiting download starts
- [x] The cancelled download's `.part` file stays in the download folder
- [x] Retrying a cancelled download resumes from its `.part`
- [x] Removing a cancelled download deletes its `.part`
- [x] A cancel that arrives after the download already ended still doesn't stop the next one
- [x] The queue's cancel unit test is updated for the new behaviour, and `cargo test` passes

## Comments

- Open: a Cancel that lands after the transfer finished but before the worker calls `finish` moves the finished download into the failures (before, it was dropped without being recorded). The window is tiny; fixing it means `finish` taking the episode id and pulling a succeeded one back out of the failures.
