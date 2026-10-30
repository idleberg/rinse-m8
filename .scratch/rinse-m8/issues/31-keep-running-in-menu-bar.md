# 31: Keep running in the menu bar

**What to build:** A "Keep running in menu bar" setting, off by default, keeps the app running after its window closes, so the subscription poller and the download queue carry on. While the setting is on, a menu bar icon (a tray icon on Windows) offers Show and Quit. Closing the window hides it instead of quitting. Quit, from that menu or with Cmd+Q, is the only way to quit for good. Turning the setting off removes the icon, and closing the window quits again.

On macOS, the icon's menu opens on left-click, and clicking the Dock icon brings the hidden window back. On Windows and Linux, left-clicking the icon shows the window and right-clicking opens the menu.

**Blocked by:** 30 (Settings view)

**Status:** ready-for-agent

- [ ] Settings has a "Keep running in menu bar" checkbox, off by default, that persists across restarts
- [ ] Turning it on shows the menu bar or tray icon at once. Turning it off removes it. With it on, the icon is there at launch
- [ ] With it on, closing the window hides it, and notifications and queued downloads keep arriving
- [ ] Show brings the window back and focuses it, and so does clicking the Dock icon on macOS
- [ ] Quit and Cmd+Q quit the app
- [ ] On Windows, left-click on the tray icon shows the window and right-click opens the menu
- [ ] With it off, closing the window quits as before
