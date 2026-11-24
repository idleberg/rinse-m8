# 01: Pick Swizz: Helvetica on greys

Status: resolved

**What to build:** A fourth built-in theme, Swizz, that follows Swiss design in the manner of the mid-century Geigy / Ciba-Geigy pharma packaging: Helvetica set flush left on white and grey, colour used sparingly. This ticket makes it pickable and gives it its type and neutral colours; tables and colour accents follow in later tickets.

The font stack is Neue Helvetica, Helvetica Neue, Helvetica, then Inter, which comes from an npm package (regular and bold, like the other themes' fonts). Numbers are tabular, so dates, times and counts line up; the columns are sized in `ch`, which tabular figures keep equal to the digit width. On macOS Helvetica Neue is always installed, so Inter only renders on Windows and Linux.

Paper, ink and muted are an off-white, a near-black and a warm grey, with a dark appearance to match:

| Token     | Light              | Dark               |
| --------- | ------------------ | ------------------ |
| `--paper` | `rgb(246 245 242)` | `rgb(30 30 30)`    |
| `--ink`   | `rgb(28 28 28)`    | `rgb(232 230 226)` |
| `--muted` | `rgb(112 112 108)` | `rgb(150 150 146)` |

Labels keep their text as written (`--case: none`).

**Blocked by:** None (can start immediately)

- [x] Swizz is listed in the Theme menu after M8PL8, applies when picked, and is still applied at first paint after a restart.
- [x] Text is in Helvetica Neue on macOS and in Inter where no Helvetica is installed, in regular and bold.
- [x] Numbers are tabular.
- [x] Paper, ink and muted use the values above in both appearances, including in the inverted area.
- [x] Labels are not uppercased.
- [x] The theme test expects Swizz among the built-in themes, and the theming doc names it with the others.
- [x] `pnpm check` and `bun test` pass.
