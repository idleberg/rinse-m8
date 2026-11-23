# Theming

A **theme** is a stylesheet. It can change the colour tokens, and it can restyle, re-lay-out and realign the **theme parts** listed below. **Appearance** (light, system or dark) is separate: every theme works in all three.

This list is the public contract. Renaming or removing a part, a state hook or an icon name is a breaking change, since it breaks users' custom stylesheets. Anything not listed here, such as table internals or the flyout, may change without notice.

## Writing a theme

- Prefix every rule of a built-in theme with `:root[data-skin="<name>"]`. The prefix beats the global element rules and the components' own state rules, so no `!important` is needed.
- A custom stylesheet is `custom.css` in the app's config folder (Settings, Custom style, Open folder), read at launch. Prefix its rules with `:root`, or with `:root[data-skin="<name>"]` to tweak one theme. Without a prefix, `.player-bar` loses to the component's own scoped styles. It loads last, so it wins ties with the built-in themes.
- The app sets `data-theme="light"` or `data-theme="dark"` on the root for a forced appearance, and no attribute for system. Use `light-dark()` in tokens rather than targeting it.
- Redefine tokens on both `:root` and `.inverted`. WebKit resolves `light-dark()` where a custom property is declared, not where it's used, so a token declared only on the root keeps the root's appearance inside `.inverted`.
- A tab is a `button`, so it gets the button's look unless a theme restyles `.tab` on its own.

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
