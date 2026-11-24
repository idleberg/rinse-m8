# 02: Swiss tables

Status: resolved

**What to build:** In Swizz, every table is ruled like a classic Swiss table: a thick line below the header row and a thin hairline below each row, in place of Base's row of `-` characters. This covers the episode tables, the show directory, and the downloads and player tables.

The header line is 2px in the text colour, and the header loses a pixel of padding so the row height doesn't change. The row line is 1px of the text colour at about 30%, a light grey that still follows the inverted area and failed rows. The tables style their lines in scoped component styles, which the theme's prefixed rules outrank.

**Blocked by:** 01

- [x] Each table has a 2px line below its header row and a 1px light grey line below each row, with no dashed row left.
- [x] Row and header heights are the same as in the other themes.
- [x] The lines follow the text colour in both appearances, in the inverted area and on failed rows.
- [x] The drop line shown while dragging a row still sits over the row line.
- [x] No column is clipped or misaligned in the proportional font: dates, times, stations and play counts fit their widths.
