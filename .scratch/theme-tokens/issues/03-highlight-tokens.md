# 03: Highlight tokens

Status: ready-for-agent

**What to build:** Themes can give hovered navigation entries their own colour with two tokens instead of restyling each part. `--highlight` and `--on-highlight` colour the background and text of hovered tabs (but not the active tab, which keeps its paper fill so it opens into the page), hovered flyout entries and hovered select options. They default to `--ink` and `--paper`, which is the look these get today. Graphix replaces its three-selector hover rule and its private `--orange` with the pair: the orange and the fixed dark text it uses now. The volume bar keeps its orange fill through `--fill`.

Tabs and flyout entries get their hover look from the global button rule today, so they need their own hover rule that reads the pair. Keep any component state rule wrapped in `:where()`, as the other state rules are, so themes can still override it.

**Blocked by:** None (can start immediately)

- [x] Hovered tabs except the active one, hovered flyout entries and hovered select options use `--highlight` and `--on-highlight`.
- [x] Both tokens are unset by default: each part falls back to its current look (tabs paper on ink's bar, flyout entries and options ink), since the reversed tab bar can't share one ink/paper default.
- [x] Graphix sets the pair, its hover rule is gone, and `--orange` is either gone or only feeds `--highlight` and `--fill`.
- [ ] Asciitron looks unchanged: those hovers still invert to paper on ink, in both appearances and in Settings.
- [ ] Graphix looks unchanged: orange hover with dark text in both appearances, and the active tab is not highlighted.
- [ ] Other buttons' hover is untouched in both themes.
- [x] Both tokens are in the tokens table of the theming doc.
- [x] `pnpm check` and `bun test` pass.
