# 02: Theme picker with Default and Brackets

Status: ready-for-agent

**What to build:** Settings gets a Theme picker next to the Appearance toggle (Light / System / Dark). It offers Default, which looks exactly like the app does today, and Brackets. Brackets restyles the theme parts, not only colours. Active and hovered tabs and pressed toggle buttons are drawn as `[Label]`, without the inverted fill, the way checkboxes are drawn as `[ ]` / `[×]`. The picked theme applies immediately, is remembered between launches, and is set before the first paint. Theme and Appearance are independent: every theme works in light, dark and system. See the spec for the implementation decisions (root attribute, one stylesheet per theme, specificity, `.inverted` token blocks, alt-text `content`).

**Blocked by:** 01 (Theme parts).

- [x] A theme store holds the built-in theme list and the current theme. It sets the theme's root attribute and persists the choice. Default removes both.
- [x] The app shell's inline script applies the stored theme before render. An unknown name falls back to Default.
- [x] Settings shows a Theme picker styled like the Appearance toggle.
- [x] Brackets lives in its own stylesheet, prefixes every rule with `:root[data-skin="brackets"]`, and targets only the documented theme parts and states.
- [ ] Brackets: the active tab and the hovered tab show `[Label]`. The Favs heart shows `[♥]` on one line.
- [x] Brackets: tabs don't shift when the active tab changes.
- [x] Brackets: buttons with `aria-pressed="true"` get the same treatment.
- [ ] Brackets: the focus ring stays visible on tabs and buttons.
- [ ] Brackets: screen readers don't announce the brackets. Checked in WKWebView, WebView2 and WebKitGTK, or noted as a known gap on Linux.
- [ ] The Settings page's `.inverted` look works in both themes and all three appearances.
- [x] Bun tests cover the store: picking a theme sets the attribute and persists it, Default clears both, and an unknown stored name loads as Default.
- [x] `pnpm check` and `bun test` pass.
