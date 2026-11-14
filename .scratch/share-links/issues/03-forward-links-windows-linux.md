# 03: Forward links to the running app on Windows and Linux

**What to build:** On Windows and Linux, opening a link starts a second process. Forward the link to the instance that's already running (usually sitting in the tray), so its window comes forward and opens the show view, and the second process exits. Also register the scheme at runtime on these platforms, so links work in dev builds and AppImages.

Use Tauri's single-instance plugin with its deep-link feature, registered ahead of the other plugins as its docs require.

**Blocked by:** 01: Open a show view from a `rinse-m8://` link

**Status:** ready-for-agent

- [ ] With the app running (window shown or only in the tray), opening a link brings the existing window forward and opens the show view
- [ ] No second instance or window appears
- [ ] Links work under `tauri dev` on Windows and Linux
