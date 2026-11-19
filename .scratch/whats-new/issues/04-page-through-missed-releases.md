# 04: Page through every missed release

**What to build:** A user who skipped several versions sees the notes of every version they missed, one page per version. The pages cover each version with notes that is newer than the seen version and no newer than the current one, newest first. Each page has the title "What's new in <version>". Newer and Older buttons move between pages and are disabled at either end, and an `n/m` counter shows the position. With a single page there are no paging controls. OK, Esc and `[×]` close the dialog from any page. Closing it counts every page as seen, even ones not paged to: the seen version is already recorded as the current one on launch. Newer and Older are arrow buttons. The DevPanel preview pages through every bundled note.

**Blocked by:** 03

**Status:** ready-for-agent

- [x] The pure function returns every version with notes in range, newest first, with a test covering several versions, including ones outside the range
- [x] With several unseen versions, the dialog pages through them newest first, with a counter and Newer/Older buttons disabled at the ends
- [x] With one unseen version, there are no paging controls
- [x] OK, Esc and `[×]` close the dialog from any page
- [x] The DevPanel preview pages through all bundled notes
- [x] Type checks, lint and tests pass

## Comments
