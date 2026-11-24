# 02: Custom theme survives a restart

Status: ready-for-agent

**What to build:** A picked custom theme applies from the first paint at launch, without a flash of Graphix, just as built-in themes do. If its folder was deleted or renamed since, the app falls back to Graphix, as it already does for a built-in theme removed in an update.

The first-paint script in the app shell can't call the backend, so the store also keeps the stylesheet's asset URL in localStorage when a custom theme is picked. A small inline script at the end of the app shell's body adds the custom theme link from that URL before the app starts. Being in `body`, it still comes after every style in the head. The store reuses that link by its id instead of adding a second one.

The head script treats a stored custom pick like a theme without an attribute and sets no `data-skin`.

**Blocked by:** 01 (Pick a custom theme from a theme folder)

- [x] Picking a custom theme stores its asset URL as well. Picking a built-in theme removes it.
- [x] At launch, a stored custom theme's link is in the page before the app renders, and the store reuses it.
- [ ] After a restart with a custom theme picked, the first paint is already in that theme, in all three appearances.
- [x] Once the startup list arrives, a stored custom theme that's no longer in it falls back to Graphix: the link and stored URL are removed and Graphix is stored.
- [x] Bun test: a stored custom theme missing from the list loads as Graphix.
- [x] `pnpm check` and `bun test` pass.
