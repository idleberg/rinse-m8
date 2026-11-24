# 01: Text case token

Status: ready-for-agent

**What to build:** Themes can turn off the uppercase labels with one token instead of an `!important` override. Every rule that sets `text-transform: uppercase`, in the global stylesheet and in the components' scoped styles, uses `var(--case)` instead. The global stylesheet sets `--case: uppercase` on the root. Graphix replaces its catch-all `text-transform: none !important` rule with `--case: none`. A custom stylesheet can do the same.

`--case` doesn't use `light-dark()`, so it only needs declaring on the root, not on `.inverted` as well.

**Blocked by:** None (can start immediately)

- [x] No rule sets `text-transform: uppercase` directly. Each one reads `var(--case)`.
- [x] Graphix sets `--case: none`, and its `!important` text-transform rule is gone.
- [ ] Asciitron looks unchanged: buttons, selects, tabs, the toast, the dialogs and the Settings page are uppercase.
- [ ] In Graphix, all of those show text as written, including the Settings `.inverted` area and the dialogs.
- [x] `--case` is in the colour tokens table of the theming doc (retitle it "Tokens" if it no longer fits).
- [x] `pnpm check` and `bun test` pass.
