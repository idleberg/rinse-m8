# 02: Link and focus tokens

Status: ready-for-agent

**What to build:** Themes can recolour links and the focus ring without taking the accent away from errors, the loved heart and repeat one. Two new tokens, `--link` and `--focus`, both default to `var(--accent)`. Links, the focus ring and the edge tabs' inset ring (the half of the ring the window edge would clip) use them. Graphix replaces its link rule, its focus rule and its two edge-tab rules with `--link: var(--info)` and `--focus: currentColor`.

Declare the defaults in the same block as the other tokens, on the root and on `.inverted`. Declared on the root alone, `var(--accent)` would be resolved there and inherited, so the Settings page would get the other appearance's red. `currentColor` in an unregistered custom property resolves where it's used, so Graphix's ring still follows each element's text colour (paper on idle tabs).

**Blocked by:** None (can start immediately)

- [x] Links, `:focus-visible` outlines and the edge tabs' inset focus ring read `--link` or `--focus`, not `--accent`.
- [x] Both tokens default to `var(--accent)` on the root and on `.inverted`.
- [x] Graphix sets `--link` and `--focus`, and its link, focus and edge-tab rules are gone.
- [x] Asciitron looks unchanged: red links and focus ring in both appearances and in Settings.
- [x] In Graphix, links are blue and the focus ring is the text colour, including on idle and edge tabs and in Settings. Components that set their own link colour, like What's New's, still win.
- [x] Both tokens are in the tokens table of the theming doc, and `--accent`'s row no longer lists links and the focus ring.
- [x] `pnpm check` and `bun test` pass.
