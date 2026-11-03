# 07: Routes

**What to build:** Each tab becomes its own route: My Shows at the root, then player, schedule, shows, downloads and settings, and the show view at the show's slug under shows. The root layout holds the nav, the error and update banners, the download status and player bars and the confirm dialog, and calls every module's `init()`. The static adapter serves an SPA fallback instead of prerendering. A notification click and the tray's Settings item navigate instead of setting a view. Route-specific derived lists (the dashboard's latest episodes and show sections, the schedule episodes, the filtered directory) live in their route; the show view's details and refreshing state live in the show route, the image cache size in the settings route. Settings keep their inverted colours.

**Blocked by:** 03 (Downloads module), 04 (Settings, subscriptions, Last.fm and updates modules), 05 (Episodes, filters and directory modules), 06 (Player module)

**Status:** ready-for-agent

- [ ] Every tab is reachable from the nav, which marks the current one
- [ ] Opening a show from any table, the directory or a new-episode notification lands on its show view, with cached details first
- [ ] The tray's Settings item opens settings
- [ ] Back and forward move between views
- [ ] Reloading the window on a show view shows that show again
- [ ] Playback and downloads continue uninterrupted across navigation
- [ ] The view switch and its single page are gone
- [ ] `bun test` and `svelte-check` pass, and a production build runs in Tauri
