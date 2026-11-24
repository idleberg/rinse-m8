# 03: Magenta and petrol replace red and blue

Status: resolved

**What to build:** Base's red (`--accent`) and blue (`--info`) have shown up in every theme so far. Swizz replaces both with hues from Geigy's palette: red becomes a magenta, after Geigy's "magenta on yellow", and blue becomes a petrol, a teal. Links follow `--info`, so they turn petrol.

| Token      | Light             | Dark               |
| ---------- | ----------------- | ------------------ |
| `--accent` | `rgb(168 52 112)` | `rgb(225 130 180)` |
| `--info`   | `rgb(40 110 110)` | `rgb(120 190 185)` |

This ticket covers where the two are used as text, icons and lines. The surfaces built on them, such as the banners and What's New, are ticket 04.

**Blocked by:** 01

- [x] The loved heart, the repeat-one fill, failed rows and badges, the live dot, the drop line and the Settings GitHub link are magenta.
- [x] Links are petrol.
- [x] Each colour is at least 4.5:1 against the paper it sits on, in both appearances, and the paper-coloured text on the repeat-one fill is too.
- [x] Nothing above shows Base's red or blue, in either appearance or in the inverted area.
