# 04: Document the remaining theme parts

Status: resolved

**What to build:** A custom theme can do everything Graphix does using only documented theme parts. Graphix currently targets parts that the theming doc doesn't list, or that it calls private:

- destructive buttons
- the dialog's title bar, close button and body-to-footer line
- What's New
- flyout entries
- the first and last tabs
- the volume bar inside its wrapper

Give the dialog's title bar and close button stable class names, and point Graphix's rules at them instead of at structural selectors like `dialog > form > header` and the close button's aria-label. Then add every part above to the parts list with its states. Take the flyout out of the doc's examples of private elements; table internals stay private.

The doc also gets a short section on colouring a surface. Banners, the toast and the download bar are coloured by redefining `--ink` and `--paper` on the part, so its text, line, progress fill and hovered buttons all follow. Explain that this is the way to colour a part, rather than adding a token per surface.

**Blocked by:** 03 (Highlight tokens), because the flyout entry's hover is documented through the highlight pair.

- [x] The dialog title bar and close button carry stable class names, and Graphix uses them.
- [x] The parts table in the theming doc lists: Destructive button, Dialog, Dialog header, Dialog close, What's New, Flyout entry, and the first and last tabs (under Tab or as their own rows). Each row gives its states.
- [x] Every selector in Graphix is either a documented part, a state of one, or an element covered by the global element rules.
- [x] The theming doc explains the "redefine `--ink`/`--paper` on a part" pattern for coloured surfaces.
- [x] The flyout is no longer named as private.
- [x] Both themes look unchanged, in all three appearances, with a dialog, What's New and the flyout open.
- [x] `pnpm check` and `bun test` pass.
