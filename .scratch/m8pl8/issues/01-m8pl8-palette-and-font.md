# 01: M8PL8 in the Theme menu, in the icon's two colours

Status: ready-for-agent

**What to build:** A third built-in theme, M8PL8, made from the app icon's two colours: yellow `rgb(255 193 49)` and black `rgb(0 0 0)`. It's listed in the Theme menu after Graphix. Like the other built-in themes, it's a stylesheet on top of Base, prefixed with its own `data-skin`, and the first-paint script knows it, so a restart with M8PL8 picked paints it straight away.

In the light appearance the paper is yellow and the ink black. In the dark appearance they swap. The inverted area (Settings and the player bar) flips as it does in every theme. The font is IBM Plex Mono and labels are uppercase, as in Asciitron.

Only the two colours are used. The muted token is a tint of the two (ink mixed into paper), so disabled text still reads as disabled. Accent and info fold into ink, so links, badges, the loved heart and failed-download rows are black or yellow. This was a deliberate choice: repeat-one looks like repeat-all, and failed rows look like normal rows.

Base already provides the focus ring in the text colour and the dialog line, so the theme only sets tokens and the font.

**Blocked by:** None (can start immediately)

- [x] M8PL8 is in the Theme menu after Graphix, and picking it sets `data-skin="m8pl8"` on the root.
- [x] After a restart with M8PL8 picked, the first paint is already M8PL8.
- [x] Light appearance: yellow paper, black ink. Dark: black paper, yellow ink. System follows the OS. The inverted area shows the opposite in each.
- [x] Text and form controls use IBM Plex Mono, and labels are uppercase.
- [x] Disabled buttons are visibly muted, in both appearances and in the inverted area.
- [x] Links, badges, the loved heart, repeat-one and failed rows use ink. No colour beyond the two appears outside the parts covered by 02 and 03.
- [x] Asciitron and Graphix look unchanged.
- [x] The theming doc names M8PL8 among the built-in themes.
- [x] `pnpm check` and `bun test` pass.
