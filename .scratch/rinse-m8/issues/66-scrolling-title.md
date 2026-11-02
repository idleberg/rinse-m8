# 66: Scrolling title

**What to build:** The player prints the full title instead of cutting it off: the show title, then the episode's subtitle (display title) if it has one, then the date.

- If the title fits its space, it stays still.
- If it doesn't fit, it scrolls right to left without stopping. A centred dot (`·`) separates the end of the title from its start on the next pass.
- It works the same in the bottom bar and below the controls on the Player tab. In the bar, the title leaves the seek bar enough room.
- With reduced motion turned on, a long title truncates with an ellipsis instead of scrolling.

**Blocked by:** 65 (Tab layout for the Player tab's controls)

**Status:** done

- [x] The label includes the subtitle when the episode has one
- [x] A short title doesn't scroll, in the bar or on the tab
- [x] A long title scrolls right to left without stopping, with `·` between passes, at the same speed whatever its length
- [x] Resizing the window starts or stops the scrolling as the title stops or starts fitting
- [x] Screen readers read the title once, not the repeated copy
- [x] Reduced motion shows a truncated, still title
