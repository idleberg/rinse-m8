# 08: Dev panel with the fake update

**What to build:** A developer panel docked on the right side of the window, opened and closed with Cmd/Ctrl+Shift+D. It exists only when the app runs in dev mode (what `mise run dev` starts), so release builds drop it. A distinct background and a left border set it apart from the app; its controls use the app's own buttons and checkboxes. Its first control shows a fake update (version 9.0.9) in the update bar, whose download runs to 100% and doesn't relaunch, replacing `VITE_FAKE_UPDATE` and the `dev:update` mise task.

**Blocked by:** 07 (Routes), as the panel lives in the root layout and drives the `updates` module

**Status:** ready-for-human (needs a look in `mise run dev`: shortcut and layout)

- [ ] Cmd/Ctrl+Shift+D opens and closes the panel under `mise run dev`
- [x] A production build has no panel and no shortcut
- [ ] The panel stands apart visually (own background, left border) and doesn't cover the bars at the bottom of the window
- [x] The update control shows and hides the fake update, and its download shows progress up to 100%
- [x] `VITE_FAKE_UPDATE` and the `dev:update` mise task are gone
- [x] `bun test` and `svelte-check` pass
