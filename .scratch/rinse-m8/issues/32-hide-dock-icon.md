# 32: Hide the Dock icon while in the menu bar

**What to build:** On macOS, hiding the window to the menu bar also removes the app's Dock icon, so the app shows only in the menu bar. Showing the window again from the menu bar brings the Dock icon back.

**Blocked by:** 31 (Keep running in the menu bar)

**Status:** done

- [ ] Closing the window with "Keep running in menu bar" on removes the Dock icon
- [ ] Show from the menu bar brings back both the window and the Dock icon
- [ ] Cmd+Tab no longer lists the app while its window is hidden
- [ ] Windows and Linux builds are unaffected

## Comments

Implemented in `src-tauri/src/lib.rs`: the close handler hides the Dock icon, and `show_window` brings it back. Lints and tests pass. Every box above needs the running app and is still unchecked.

- Tauri's `set_dock_visibility` turns the app into a UI element, which also takes it out of Cmd+Tab.
- tao ignores a hide within a second of a show, to work around duplicate Dock icons. Closing the window within a second of showing it leaves the Dock icon in place until the next close.
