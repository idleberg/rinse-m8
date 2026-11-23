# Themes

Status: ready-for-agent

## Problem Statement

Rinse M8 has one look. Users can switch between light, dark and the system setting, but they can't change how the app is drawn. That covers the colours, and also how buttons, bars, checkboxes and tabs are laid out, aligned and styled. Someone who wants the active tab drawn as `[Player]`, centred tabs, or a slimmer player bar has no way to get it.

## Solution

Settings gets a **Theme** picker next to the existing Appearance toggle (Light / System / Dark). The app ships a short list of themes. Each theme works in both light and dark, so Theme and Appearance are independent.

A theme is a stylesheet. It can change the colour tokens, and it can restyle, re-lay-out and realign the app's **theme parts**. Theme parts are a fixed, documented set of elements (tab bar, tabs, buttons, checkboxes, selects, progress bars, the player bar, the download bar, the toast, the banners) that carry stable names themes can target.

Users can also put a **custom stylesheet** in the app's config folder. It loads after the built-in styles and can do anything a built-in theme can. Settings has a button that opens that folder.

The first built-in theme besides the current one is **Brackets**. Active and hovered tabs and pressed buttons are drawn as text, `[Player]`, the way checkboxes are already drawn as `[ ]` / `[×]`, without the inverted fill.

## User Stories

1. As a user, I want to pick a theme in Settings, so that the app looks the way I like.
2. As a user, I want the picked theme applied immediately, so that I can compare themes without restarting.
3. As a user, I want my theme remembered between launches, so that I only pick it once.
4. As a user, I want the theme applied from the first paint, so that the app doesn't flash the default theme at launch.
5. As a user, I want themes to respect my light/dark/system appearance, so that a theme doesn't force a colour scheme on me.
6. As a user, I want the Settings page's inverted look to keep working with every theme, so that Settings still stands apart from the other pages.
7. As a user, I want a Default theme that looks exactly like the app does today, so that nothing changes unless I choose it.
8. As a user of the Brackets theme, I want the active tab shown as `[Label]`, so that the navigation matches the checkbox style.
9. As a user of the Brackets theme, I want a hovered tab previewed as `[Label]`, so that hover still previews the pressed look as it does now.
10. As a user of the Brackets theme, I want the tabs to stay in place when the active one changes, so that the navigation doesn't jump.
11. As a user of the Brackets theme, I want the Favs heart tab bracketed on one line, `[♥]`, so that it matches the text tabs.
12. As a user of the Brackets theme, I want pressed toggle buttons (such as the Appearance and Theme pickers) drawn the same way, so that "selected" looks consistent across the app.
13. As a keyboard user, I want the focus ring to stay visible in every theme, so that I can always see where focus is.
14. As a screen reader user, I want decorative theme glyphs left out of announcements, so that tabs are read as "Player", not "left bracket Player right bracket".
15. As a theme author, I want to restyle buttons (border, fill, padding, case, and the hover, pressed, focus and disabled look each on its own), so that buttons can match a theme's style.
16. As a theme author, I want to restyle checkboxes (glyphs, size, alignment), so that they can be drawn differently from `[ ]` / `[×]`.
17. As a theme author, I want to restyle the tab bar and tabs (height, spacing, alignment, borders, and the active, hover and focus look apart from other buttons'), so that the navigation can be laid out differently, for example centred.
18. As a theme author, I want to restyle the player bar and the download bar separately (height, spacing, borders, background), so that each bar can look different.
19. As a theme author, I want to restyle the toast and the banners, so that messages match the theme.
20. As a theme author, I want to restyle selects, progress bars and the player's seek and volume bars, with a bar's outline and fill styled separately, so that form controls match the theme.
21. As a theme author, I want to restyle all icons at once (stroke, size, colour) or one icon on its own, so that icons match the theme.
22. As a theme author, I want a documented list of theme parts and colour tokens, so that I know what I can target without reading component code.
23. As a theme author, I want the theme parts' names to stay stable across releases, so that my custom stylesheet doesn't break on update.
24. As a power user, I want to place a custom stylesheet in the app's config folder, so that I can restyle the app myself.
25. As a power user, I want the custom stylesheet applied on top of whichever theme I picked, so that I can tweak a built-in theme rather than start from scratch.
26. As a power user, I want to open the config folder from Settings, so that I don't have to find it on disk.
27. As a power user, I want a missing custom stylesheet to be silently ignored, so that the app works the same as before when I haven't made one.
28. As a power user, I want an unreadable custom stylesheet reported as an error, but the app to keep working, so that a broken file doesn't lock me out.
29. As a user, I want a theme that was removed in an update to fall back to Default, so that the app never ends up unstyled.

## Implementation Decisions

- **Vocabulary.**
  - **Theme**: the named look (Default, Brackets).
  - **Appearance**: light / system / dark, as the existing toggle's label already says.
  - **Theme part**: an element a theme may restyle.
  - Add all three to the glossary. Image style stays a separate concept and must not be called a theme.
- **Themes are CSS, not a class map.** Components don't take class props. Instead, every theme part carries a fixed name in the markup, and theme stylesheets target those names. Svelte's scoped styles and pseudo-elements couldn't be reached through props anyway.
- **Theme parts and their hooks.**
  - Parts already drawn by global element rules (button, icon button, pressed button, checkbox, select, progress, search input) are targeted by element, attribute and the existing global classes. They need no new names.
  - Parts drawn by component-scoped styles get a stable class name in the markup: tab bar, tab, player bar, download bar, toast, update banner, error banner and the Settings inverted area. Today the player bar and the download bar are both an unnamed `footer`, and themes can't tell them apart.
  - The player's seek and volume bars are parts too. They're range inputs drawn in component-scoped styles, not `<progress>`, so they need their own names.
  - Class names are used rather than `data-*` attributes because Svelte keeps them unhashed, and they read naturally in CSS.
  - The exception is icons. Each inline icon SVG carries `data-icon` with a fixed name (`play`, `pause`, `next`, `heart`, …), so a theme can restyle one icon on its own. `button.icon svg` still targets all of them. Swapping an icon for text stays out of scope.
  - The list of parts and their names is documented in one place, and that list is the public contract. Component internals not on the list may change without notice.
- **States are part of the contract.** For each part, the doc lists the states a theme can target: `:hover`, `:focus-visible`, `:disabled`, `[aria-pressed="true"]` and `[aria-current="page"]`, where they apply. Today one global rule gives hover, pressed and current page the same look. A theme can split them by targeting each state separately. A tab is a `button`, so it gets the button's look unless a theme restyles `.tab` on its own. That's the inheritance between parts; no extra mechanism is needed.
- **Bar outline and fill.** The outline is the bar's `border`. The fill colour is a new token, `--fill`, which defaults to `--ink`. `progress::-webkit-progress-value` and the range inputs' fill gradient both use it, so one token recolours every bar's fill without touching its outline.
- **Default styles stay where they are.** The current look of each part stays in its component or in the global stylesheet. A theme overrides it rather than replacing it. Moving every part's default look into a Default theme stylesheet would be a large move with no user-facing gain. Do it only if overriding turns out to be painful in practice.
- **Root attribute.** The existing `data-theme` attribute and its `theme` storage key keep meaning Appearance, so stored values need no migration. The theme name goes on a new root attribute (`data-skin`) and is stored in localStorage under its own key. Default sets no attribute.
- **First paint.** The inline script in the app shell that already applies Appearance before render also applies the stored theme, but only if the name is in the built-in list. Unknown names fall back to Default.
- **Built-in themes live one stylesheet per theme.** Each theme's rules are prefixed with `:root[data-skin="<name>"]`, not just the attribute.
- **Specificity.**
  - The `:root[data-skin]` prefix makes theme rules beat the global element rules.
  - Against component-scoped selectors it isn't enough on its own. Svelte 5 adds a class's worth of specificity to each scoped selector, so some state rules still tie with a theme rule or beat it: `.toast button:hover`, the edge tabs' `:focus-visible`, `.loved:not(:hover)` and `.one`.
  - Component rules that style a part's state wrap their selector in `:where()`, so a theme can override them without `!important`.
  - A custom stylesheet loads last, so it wins ties.
- **Token blocks also on `.inverted`.** Any theme that redefines colour tokens declares them on the root and on `.inverted`, because WebKit resolves `light-dark()` where a custom property is declared, not where it's used.
- **Brackets theme specifics:**
  - Tabs and buttons with `aria-pressed="true"` lose the inverted fill and keep paper/ink.
  - Every such button reserves the bracket width with spaces in `::before`/`::after`. Active or hovered ones swap the spaces for `[` and `]`. This only works because the UI font is monospace.
  - Bracket content uses the empty alt-text form of `content` so screen readers skip it.
  - Tabs become inline flex containers so the brackets sit beside the block-level Favs SVG, not above and below it.
  - Focus styles are not overridden.
- **Theme store.** A small module owns the list of built-in themes and the current choice. It applies the root attribute and persists the choice, mirroring how the Appearance toggle works today. The Settings picker reads and writes it.
- **Custom stylesheet.**
  - A fixed file in the app config directory (`custom.css`). A Rust command reads it and returns its text, or nothing when the file is absent.
  - At startup, the frontend appends the text as a `<style>` element after the app's styles.
  - Read errors go through the existing error reporting.
  - Settings gets an "Open folder" button that reveals the config directory with the opener plugin's reveal, already used for "Show in folder". It sits next to a link to, or short list of, the theme parts and tokens.

## Testing Decisions

- Test external behaviour only: what the store exposes, what attribute ends up on the document root, and what is persisted. Don't test the CSS rules themselves.
- **Theme store (bun test).**
  - Picking a theme sets the root attribute and persists it.
  - Picking Default removes both.
  - An unknown stored name loads as Default.
  - Prior art: `settings.test.ts` and `toast.test.ts`, which import a `.svelte.ts` store after mocking Tauri modules.
- **Custom stylesheet loading (bun test).**
  - Mock `invoke` like `settings.test.ts` does.
  - Returned text ends up in a `<style>` element after the existing styles.
  - Nothing is added when there is no file.
  - A rejected command reaches `errors`.
- **Rust command.** Covered by a unit test only if the crate's existing tests make that cheap. It's a file read with a not-found case.
- **Theme parts (manual).** A sample stylesheet that targets every documented part works as a smoke test of the contract. For example:
  - centre the tabs
  - change the player bar's height and border
  - give the download bar a background
  - change the checkbox glyphs
  - square off or round the buttons

  Load it as `custom.css` and check that every part changes and nothing else does.
- **Visual check (manual, `pnpm tauri dev`).**
  - Every theme × light/system/dark.
  - The Settings `.inverted` area.
  - Tabs including Favs, with no shift on tab change.
  - Hover, keyboard focus ring, checkbox, select, progress bar, both bars, toast.

## Out of Scope

- Themes that change markup: swapping icons for text, adding or removing elements, reordering beyond what CSS `order` allows.
- Theming parts not on the documented list, such as table internals and the flyout. Add them to the list when a theme needs them.
- Live reload of the custom stylesheet while the app runs. It's read at launch.
- Several user-defined named themes, or user themes in the picker.
- A theme editor UI.
- Theme-specific fonts. Fonts are bundled, and a custom stylesheet can add its own `@font-face`.
- Theming the native title bar beyond what Appearance already sets.
- Right-to-left layout. Text direction follows the language, not the theme, and the app is English only. It belongs with localisation, which would also replace the physical properties (`margin-left`, `padding-left`, `left`) with logical ones.
- Text-style hover or pressed looks (generated content, like Brackets) on selects, progress bars and range inputs. WebKit doesn't render `::before`/`::after` on them, so they can only be restyled graphically.

## Further Notes

- The checkbox is already drawn purely in CSS (`appearance: none` plus generated content). That's why the Brackets treatment, and any other checkbox glyphs, need no markup changes.
- The `content: "…" / ""` alt-text syntax must be checked in all three webviews: WKWebView, WebView2 and WebKitGTK. If WebKitGTK lacks it, fall back to plain `content` and accept the announced glyphs on Linux.
- Renaming or removing a theme part breaks users' custom stylesheets. Treat it like a breaking change and mention it in the changelog.
