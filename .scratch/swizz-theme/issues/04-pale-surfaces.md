# 04: Pale colour surfaces

Status: resolved

**What to build:** Geigy's packaging was a white box with one flat stripe or block of colour. Swizz uses pale colour the same way: only as surfaces, always with dark `rgb(28 28 28)` text, and the same in both appearances. This also removes the last of Base's white-on-red and white-on-blue surfaces.

The three pale colours:

- mint `rgb(206 228 224)`, from the petrol family
- pink `rgb(240 214 226)`, from the magenta family
- yellow `rgb(242 232 188)`

Where they go:

- **Hover:** hovered tabs, flyout entries and select options are mint, through `--highlight` and `--on-highlight`.
- **Confirm dialog:** its header is a pale yellow band, the "stripe". It needs no line below it, nor the pixel of padding the line sat in, as in Graphix.
- **What's New:** white on blue with a white border in Base; in Swizz, dark text on pale pink with a border in the text colour.
- **Update banner:** white on blue in Base; in Swizz, dark on mint.
- **Error banner:** white on red in Base; in Swizz, dark on pale pink.
- **Download bar:** dark on mint, the update banner's colours, as Graphix ties the two together.
- **Toast:** dark on pale yellow. The toast draws paper on ink, so its ink is the yellow.

Colour each surface by redefining its `--ink` and `--paper`, per "Colouring a surface" in the theming doc, so its lines, progress fill and hovered buttons follow.

**Blocked by:** 01

- [x] Hovered tabs (but not the active one), flyout entries and select options are mint with dark text.
- [x] The confirm dialog's header is a pale yellow band with dark text and no line below it.
- [x] What's New is dark on pale pink, with its border and lines in the text colour.
- [x] The update banner and download bar are dark on mint, the error banner dark on pale pink, the toast dark on pale yellow.
- [x] Each surface's lines, progress fill and hovered buttons follow its colours.
- [x] Every surface looks the same in light, dark and the inverted area, and its text is at least 4.5:1.
- [x] With 03 done, no red or blue is left anywhere in Swizz.
