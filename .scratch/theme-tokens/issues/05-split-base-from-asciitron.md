# 05: Split Base from Asciitron

Status: ready-for-agent

**What to build:** Every theme, built-in or custom, builds on **Base**: the unprefixed global styles. Today Base and Asciitron are the same rules, so anything built on Base silently inherits Asciitron's choices, and restyling or removing Asciitron would change every custom theme. After this ticket:

- **Base looks plain on its own:**
  - neutral grey tokens
  - natural case (`--case: none`)
  - focus ring in the text colour (`--focus: currentColor`)
  - links in `--info`
  - system monospace font
  - square checkbox with an X
  - solid dialog rule line
  - dialog close button as an X
- **Asciitron is a theme stylesheet like Graphix,** with every rule prefixed `:root[data-skin="asciitron"]`. It sets:
  - warm paper tokens
  - IBM Plex Mono
  - `--case: uppercase`
  - the red accent for links and focus
  - the `[ ]` / `[×]` glyphs
  - the dashed dialog line
  - What's New's black ring
- **Graphix drops what Base now provides** (case, focus, checkbox, close button, solid line). It keeps its own choices: Space Mono, the orange highlights, the green toast, the blue download bar and the dialog's inverted title bar.
- **Asciitron sets `data-skin="asciitron"`** like any built-in theme, both in the theme store and in the first-paint script. Only custom themes leave the attribute off. Removing a built-in theme then means deleting its stylesheet and its entry in the list.

Ship in the same release as the custom-themes tickets, so no one writes a custom theme against Base while it still looks like Asciitron.

**Blocked by:** 01 (Text case token), 02 (Link and focus tokens), 03 (Highlight tokens)

- [x] With no `data-skin` on the root, the app shows plain Base in all three appearances, including Settings' inverted area.
- [x] Asciitron's rules all live in its own stylesheet, prefixed `:root[data-skin="asciitron"]`. Base has none of its distinctive choices.
- [x] Asciitron looks unchanged in all three appearances.
- [x] Graphix looks unchanged in all three appearances, and its stylesheet no longer repeats what Base provides.
- [x] Picking Asciitron sets `data-skin="asciitron"`, both from the store and at first paint. The theme store tests are updated to match.
- [x] The theming doc and glossary describe Base as what every theme builds on, and Asciitron as a theme like any other.
- [x] `pnpm check` and `bun test` pass.
