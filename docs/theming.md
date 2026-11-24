# Theming

A **theme** is a stylesheet. It can change the colour tokens, and it can restyle, re-lay-out and realign the **theme parts** listed below. **Appearance** (light, system or dark) is separate: every theme works in all three.

This list is the public contract. Renaming or removing a part, a state hook or an icon name is a breaking change, since it breaks users' custom themes. Anything not listed here, such as table internals or the flyout, may change without notice.

## Writing a theme

- Prefix every rule of a built-in theme with `:root[data-skin="<name>"]`. The prefix beats the global element rules and the components' own state rules, so no `!important` is needed.
- The app sets `data-theme="light"` or `data-theme="dark"` on the root for a forced appearance, and no attribute for system. Use `light-dark()` in tokens rather than targeting it.
- Redefine tokens on both `:root` and `.inverted`. WebKit resolves `light-dark()` where a custom property is declared, not where it's used, so a token declared only on the root keeps the root's appearance inside `.inverted`.
- A tab is a `button`, so it gets the button's look unless a theme restyles `.tab` on its own.

## Custom themes

A custom theme is a folder in `themes`, in the app's config folder (Settings, Custom themes, Open folder), holding a `theme.css`. Each one is listed in the Theme menu after the built-in themes, and applies on top of Base, or the built-in theme it extends, as soon as it's picked. A folder without `theme.css` is skipped.

```text
themes/
└── solarized/
    ├── theme.css
    └── fonts/
        └── body.woff2
```

- **Header.** The menu label comes from the `@name` tag in a `/* … */` comment at the start of `theme.css`. Without one, the folder name is used. Other tags, such as `@author` or `@version`, are ignored.

  ```css
  /**
   * @name Solarized
   * @author Jane Doe
   */
  ```

- **Extends.** An `@extends` tag names a built-in theme to build on, such as `graphix`, instead of Base alone. Its rules apply, and the custom theme overrides them. An id that isn't a built-in theme, whether a typo or a theme removed in an update, is ignored, and the theme builds on Base. Only built-in themes can be extended.
- **Prefix.** Prefix every rule with `:root`, or with the extended theme's prefix, `:root[data-skin="<name>"]`, when the theme has `@extends`. Without a prefix, `.player-bar` loses to the component's own scoped styles. The theme loads after every other style, so with the same prefix it wins ties with the theme it extends.
- **Relative URLs.** `url()` resolves against the theme's folder, so `url("fonts/body.woff2")` loads the font above.
- The folder name is never set as `data-skin`, so a folder named after a built-in theme doesn't turn on its rules.

This theme keeps everything of Graphix but its colours, including in the inverted area:

```css
/**
 * @name Graphix Dusk
 * @extends graphix
 */
:root[data-skin="graphix"],
:root[data-skin="graphix"] .inverted {
	--paper: light-dark(rgb(232 222 210), rgb(34 28 40));
	--ink: light-dark(rgb(34 28 40), rgb(232 222 210));
	--muted: light-dark(rgb(120 108 112), rgb(150 138 150));
}
```

## Colour tokens

| Token      | Use                                                                         |
| ---------- | --------------------------------------------------------------------------- |
| `--paper`  | Background                                                                  |
| `--ink`    | Text, borders and the hover and pressed fill                                |
| `--muted`  | Secondary and disabled text                                                 |
| `--accent` | Links, focus ring, loved heart, repeat one, error banner                    |
| `--info`   | Update banner                                                               |
| `--fill`   | Fill of progress bars and the seek and volume bars. Unset, it uses `--ink`. |

## Theme parts

| Part           | Selector                                         | States                                                           |
| -------------- | ------------------------------------------------ | ---------------------------------------------------------------- |
| Button         | `button`                                         | `:hover`, `:focus-visible`, `:disabled`, `[aria-pressed="true"]` |
| Icon button    | `button.icon`                                    | `:hover`, `:focus-visible`, `:disabled`, `[aria-pressed="true"]` |
| Pressed button | `button[aria-pressed="true"]`                    | `:hover`, `:focus-visible`                                       |
| Icon           | `svg[data-icon]`, or `button.icon svg`           |                                                                  |
| Checkbox       | `input[type="checkbox"]`, glyph in `::before`    | `:checked`, `:focus-visible`                                     |
| Select         | `select`                                         | `:focus-visible`, `:disabled`                                    |
| Progress bar   | `progress`, fill in `::-webkit-progress-value`   |                                                                  |
| Search input   | `input[type="search"]`                           | `:focus-visible`                                                 |
| Seek bar       | `.seek-bar`, thumb in `::-webkit-slider-thumb`   | `:focus-visible`, `:disabled`                                    |
| Volume bar     | `.volume-bar`, thumb in `::-webkit-slider-thumb` | `:focus-visible`                                                 |
| Tab bar        | `.tab-bar`                                       |                                                                  |
| Tab            | `.tab`                                           | `:hover`, `:focus-visible`, `[aria-current="page"]`              |
| Player bar     | `.player-bar`                                    |                                                                  |
| Download bar   | `.download-bar`                                  | `[role="alert"]` when it shows failures                          |
| Toast          | `.toast`, its action in `.toast button`          |                                                                  |
| Update banner  | `.update-banner`                                 |                                                                  |
| Error banner   | `.error-banner`                                  |                                                                  |
| Inverted area  | `.inverted`                                      |                                                                  |

- **Bars.** A bar's outline is its `border`. Its fill is `--fill`, so one token recolours every bar's fill without touching the outline.
- **Inverted area.** Drawn in the opposite appearance: the Settings page with its tab bar and toast, and the player bar on every other page.
- **Volume bar.** Shown above the mute button while the pointer is over it or it has keyboard focus.

## Icons

Each inline icon carries `data-icon` with one of these names. `svg[data-icon="play"]` restyles one icon; `svg[data-icon]` restyles them all.

| Name          | Icon                                       |
| ------------- | ------------------------------------------ |
| `play`        | Play                                       |
| `pause`       | Pause                                      |
| `previous`    | Previous episode                           |
| `next`        | Next episode                               |
| `volume`      | Mute toggle, its bars filled to the volume |
| `repeat`      | Repeat                                     |
| `heart`       | Love, and the Favs tab                     |
| `subscribe`   | Subscribe, a plus                          |
| `unsubscribe` | Unsubscribe, a minus                       |
| `download`    | Download                                   |
| `downloaded`  | Downloaded, a check                        |
| `redownload`  | Download again, a circular arrow           |
| `reveal`      | Show in folder, a magnifier                |
| `close`       | Cancel, remove and dismiss                 |
| `newer`       | Newer release notes                        |
| `older`       | Older release notes                        |
| `more`        | Flyout trigger                             |
| `github`      | GitHub link in Settings                    |
