# 35: Clicking a notification shows the window

**What to build:** Clicking a new-episode notification brings the main window to the front, also when it's hidden in the menu bar. The Dock icon comes back the same way it does when the hidden window is shown from the menu bar. It works on macOS, Windows and Linux in release builds, as far as each notification server reports the click. On Windows, a click only counts while the toast is on screen, not once it moved to the Action Center.

In a macOS dev build, the notification plugin posts as Terminal, so a click opens Terminal. That's expected and out of scope.

**Blocked by:** None (can start immediately)

**Status:** ready-for-human (needs a click test in a release build; criterion 3 relies on macOS reopening the app, unverified)

- [x] Clicking a notification while the window is visible brings it to the front
- [x] Clicking a notification while the window is hidden in the menu bar shows it, with the Dock icon back on macOS
- [ ] Clicking a notification after a restart, from Notification Center, shows the window
