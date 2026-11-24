# 03: Reversed dialogs and banners, red error banner

Status: ready-for-agent

**What to build:** In M8PL8, the confirm dialog, What's New and the update banner use the page's colours reversed: black on yellow becomes yellow on black, and the other way round in the dark appearance. Their lines, close X, muted text and hovered buttons follow. What's New drops its white-on-blue and its white border, which takes the text colour like the confirm dialog's. The error banner is plain red (`rgb(255 0 0)`) with black text (5.3:1, where white is only 4.0:1).

Colour each part by redefining ink and paper on it, as the theming doc describes for coloured surfaces. What's New's own scoped colours have to be outranked through its documented part, not through the bare `dialog` element. The toast is already ink on paper reversed, and the download bar is Base's paper, so neither needs a rule.

**Blocked by:** 01 (M8PL8 in the Theme menu, in the icon's two colours)

- [ ] A confirm dialog (e.g. Clear Queue) shows the reversed colours in light, dark and system appearance, line and close X included.
- [ ] What's New (opened from the DevPanel) shows the same reversed colours, with its border in the text colour, and only the two colours.
- [ ] The update banner (DevPanel) shows the reversed colours, its progress bar and hovered buttons included.
- [ ] The error banner (DevPanel) is plain red with black text, on normal pages and on Settings, and its dismiss button's hover stays readable.
- [ ] Asciitron and Graphix dialogs and banners look unchanged.
- [ ] `pnpm check` and `bun test` pass.
