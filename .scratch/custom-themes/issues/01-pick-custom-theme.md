# 01: Pick a custom theme from a theme folder

Status: ready-for-agent

**What to build:** A user can add their own themes and pick them like built-in ones. The config folder holds a `themes` folder with any number of subfolders. Each subfolder with a `theme.css` is a **custom theme**. It's listed in the Theme select after the built-in themes, with an `<hr>` divider between them. Picking it applies it at once, on top of Base.

The label comes from a WordPress-style header comment at the start of `theme.css`:

```css
/**
 * @name Solarized
 */
```

Without an `@name`, the folder name is used. Other tags are ignored, so authors can add `@author`, `@version` and so on.

`theme.css` loads as a stylesheet link through the asset protocol, not as inline text, so relative `url()` references to fonts and images in the theme's folder resolve. The link sits in `body`, after every style in the head, so it wins ties. Its rules are prefixed with `:root`, as custom stylesheets are today.

This replaces the single `custom.css`, which is removed. Settings' "Custom style" row becomes "Custom themes". Its Open folder button opens the `themes` folder, creating it if needed.

The folder name must never become `data-skin`. A custom theme leaves the attribute off, so a folder named `graphix` can't turn on Graphix's rules.

Ship in the same release as theme-tokens 05 (Split Base from Asciitron). Otherwise authors would write themes against Base while it still looks like Asciitron.

**Blocked by:** None (can start immediately)

- [x] A backend command lists the custom themes: folder id, name and stylesheet path, sorted by name case-insensitively. It grants the asset protocol read access to the `themes` folder.
- [x] A folder without `theme.css` is skipped silently. A missing `themes` folder gives an empty list. An unreadable `theme.css` is reported through the error banner, and the other themes still load.
- [x] The header parser takes `@name` from a leading `/* … */` comment and falls back to the folder name. It has a Rust unit test covering: no folder, a folder without `theme.css`, a theme with `@name`, a theme without a header, and sorting.
- [x] The Theme select lists the built-in themes, then `<hr>`, then the custom themes. The divider is left out when there are no custom themes. If Svelte rejects `<hr>` in a select, use `<optgroup label="Custom">` instead.
- [x] The list is read at startup and again whenever Settings opens, so a newly added folder appears without a restart.
- [x] Picking a custom theme clears `data-skin`, points the custom theme link at its stylesheet, and stores the pick. Picking a built-in theme removes the link.
- [ ] Relative `url()` references in `theme.css` (a font, an image) load from the theme's folder.
- [x] `custom.css` loading is removed: the command, the frontend loader and their tests.
- [x] Settings shows "Custom themes" with Open folder opening `themes`, and a hint pointing to the theme parts doc.
- [x] The theming doc's custom stylesheet bullet is replaced by a Custom themes section: folder layout, the header, the `:root` prefix, and relative URLs. The glossary gets **Custom theme**, and its Theme part entry says custom themes instead of custom stylesheets.
- [x] Bun tests, with `invoke` and `convertFileSrc` mocked: picking a custom theme clears `data-skin` and stores the pick, and picking a built-in theme removes the link.
- [x] `cargo test`, `pnpm check` and `bun test` pass.
