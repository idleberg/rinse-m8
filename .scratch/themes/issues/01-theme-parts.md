# 01: Theme parts

Status: ready-for-agent

**What to build:** Every element a theme may restyle gets a stable name, and the list is documented as the contract for theme authors. Today some parts can't be targeted at all: the player bar and the download bar are both an unnamed `footer` with component-scoped styles. After this ticket, a stylesheet can restyle each part on its own: buttons, icons, checkboxes, selects, progress bars, the seek and volume bars, the tab bar and tabs, the player bar, the download bar, the toast, the banners and the Settings inverted area. It can also restyle each part's states (hover, focus, pressed, current, disabled) separately, and a bar's outline apart from its fill. The app looks exactly as before. See the spec's "Theme parts and their hooks", "States are part of the contract", "Bar outline and fill" and "Specificity" decisions.

**Blocked by:** None (can start immediately).

- [x] Parts drawn by component-scoped styles carry a stable class name in the markup: tab bar, tab, player bar, download bar, seek bar, volume bar, toast, update banner, error banner and the Settings inverted area (already `.inverted`).
- [x] Parts drawn by global element rules (button, icon button, pressed button, checkbox, select, progress, search input) are listed with the selector to target them. They need no markup change.
- [x] Every inline icon SVG carries `data-icon` with a fixed name. All icons stay targetable as `button.icon svg`.
- [x] A `--fill` token, defaulting to `--ink`, colours the fill of `<progress>` and of the seek and volume bars.
- [x] Component rules that style a part's state are wrapped in `:where()`, so a `:root[data-skin]` rule beats them. At least `.toast button:hover`, the edge tabs' `:focus-visible`, `.loved:not(:hover)` and `.one`.
- [x] One doc in the repo lists every theme part with its selector and the states it has (`:hover`, `:focus-visible`, `:disabled`, `[aria-pressed="true"]`, `[aria-current="page"]`). It also lists the icon names and the colour tokens (paper, ink, muted, accent, info, fill). It says this list is the public contract and that renaming a part, state hook or icon name is a breaking change.
- [x] The glossary defines **Theme**, **Appearance** and **Theme part**, and says Image style is not a theme.
- [ ] No visible change in light, dark or system, including Settings.
- [ ] A throwaway stylesheet that restyles each listed part (for example centred tabs, a taller player bar with a heavier border, a download bar with a background, different checkbox glyphs, rounded buttons, a tab hover that differs from the button hover, a thicker stroke on the play icon only, an accent `--fill`) changes each part independently when pasted into the dev tools, prefixed with `:root[data-skin="test"]` and that attribute set on the root. It doesn't need to be committed.
- [x] `pnpm check` and `bun test` pass.
