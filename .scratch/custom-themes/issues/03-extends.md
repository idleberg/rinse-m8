# 03: Extend a built-in theme

Status: ready-for-agent

**What to build:** A custom theme can build on a built-in theme instead of Base alone, so a user can, say, change only Graphix's colours. An optional `@extends` tag in the header names the built-in theme:

```css
/**
 * @name Graphix Dusk
 * @extends graphix
 */
:root[data-skin="graphix"],
:root[data-skin="graphix"] .inverted {
	--paper: …;
}
```

When such a theme is picked, the app sets the extended theme's `data-skin`, so its rules apply, and loads `theme.css` on top. Built-in theme rules are prefixed with `:root[data-skin="<id>"]`, so a theme that extends one uses the same prefix. The two tie on specificity, and the custom theme's link comes later, so it wins.

- An `@extends` id that isn't a built-in theme, whether a typo or a theme removed in an update, is ignored. The theme builds on Base alone. The backend doesn't validate the id; the frontend owns the built-in list.
- Only built-in themes can be extended. Extending another custom theme is out of scope.
- The first-paint script sets the extended theme's attribute too, from a stored value. It checks that value against its built-in list.

**Blocked by:** 02 (Custom theme survives a restart)

- [x] The header parser also reads `@extends`. The Rust test covers a theme with `@name` and `@extends`, and one without (no extends).
- [x] Picking a theme with a known `@extends` sets `data-skin` to that id and stores it. With an unknown or missing one, it clears both. Picking a built-in theme removes the stored value.
- [ ] At launch, a stored custom theme with a known `@extends` gets the attribute at first paint, with no flash.
- [ ] A theme with `@extends graphix` that only redefines tokens shows Graphix (font, orange hovers) in its own colours, including in Settings' inverted area.
- [x] The theming doc covers `@extends`: the prefix rule (the extended theme's prefix, or `:root` without `@extends`), what happens with an unknown id, and an example that only recolours Graphix.
- [x] Bun tests: `@extends graphix` sets `data-skin="graphix"`, and an unknown id leaves no `data-skin`.
- [x] `cargo test`, `pnpm check` and `bun test` pass.
