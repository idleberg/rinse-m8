# 18: Visual design

**What to build:** The app gets a print-catalogue look in the spirit of GiveUpArt, Made By Build and ausmusic.co.uk. Everything is set in IBM Plex Mono (already installed). There's a light and a dark palette: the app follows the system appearance, and a SYSTEM / LIGHT / DARK toggle overrides it, with the choice surviving a restart. Tables lose their zebra striping in favour of horizontal dashed rules that read like a row of ASCII `-` characters, drawn in CSS. Table text is all uppercase, dates show as `YYYY/MM/DD`, and the Time column is gone. Checkboxes are styled like `[ ]` / `[X]` while staying native inputs. The download and subscribe buttons become SVG icons (arrow-down, plus sign) with accessible labels. Until the nav from 19 exists, the theme toggle sits in a small header strip.

**Blocked by:** None (can start immediately)

**Status:** ready-for-human

- [x] IBM Plex Mono is used throughout the app
- [x] Light and dark palettes follow the system appearance by default
- [x] A SYSTEM / LIGHT / DARK toggle overrides the appearance, and the choice persists across restarts without a flash of the wrong theme
- [x] Table rows are separated by dashed rules that look like a row of `-` characters; there is no zebra striping
- [x] Table text is uppercase
- [x] Dates everywhere in the UI use `YYYY/MM/DD`
- [x] The Time column is removed from episode tables
- [x] Checkboxes render as `[ ]` / `[X]` and remain keyboard-operable with a visible focus state
- [x] Download is an arrow-down SVG icon button and subscribe is a plus-sign SVG icon button (minus when subscribed), each with an accessible label; the queued, downloading (percent), failed states stay distinguishable
- [ ] Manual check: switch macOS between light and dark appearance with the toggle on SYSTEM; the app follows. Set LIGHT, restart; it stays light
