# 02: Black tab bar with yellow tabs

Status: wontfix

Dropped after building it: in the dark appearance the black bar sat on a black page, so the yellow active tab floated with no edge and didn't open into the page. The nav's defaults reverse the bar with the appearance, as in the other themes, and need no rule.

**What to build:** In M8PL8, the tab bar is black in both appearances, with yellow active and hovered tabs and black text on them. Idle tabs show yellow text on the black bar. This holds on Settings too, where the tab bar is part of the inverted area.

Colour the tab bar the way the theming doc describes for coloured surfaces: redefine ink and paper on the part, with fixed values rather than `light-dark()`. The nav already fills with ink and turns active and hovered tabs paper, so no hover rule or highlight token is needed. On Settings, the rule ties with the theme's `.inverted` tokens, so it has to come after them.

**Blocked by:** 01 (M8PL8 in the Theme menu, in the icon's two colours)

- [x] The tab bar is black with yellow idle-tab text in light, dark and system appearance.
- [x] The active tab and hovered tabs are yellow with black text, including the Favs heart.
- [x] Same look on Settings.
- [x] The focus ring is visible on idle, active, first and last tabs.
- [x] `pnpm check` and `bun test` pass.
