# 07: Routes

**What to build:** Each tab becomes its own route: My Shows at the root, then player, schedule, shows, downloads and settings, and the show view at the show's slug under shows. The root layout holds the nav, the error and update banners, the download status and player bars and the confirm dialog, and calls every module's `init()`. The static adapter serves an SPA fallback instead of prerendering. A notification click and the tray's Settings item navigate instead of setting a view. Route-specific derived lists (the dashboard's latest episodes and show sections, the schedule episodes, the filtered directory) live in their route; the show view's details and refreshing state live in the show route, the image cache size in the settings route. Settings keep their inverted colours.

**Blocked by:** 03 (Downloads module), 04 (Settings, subscriptions, Last.fm and updates modules), 05 (Episodes, filters and directory modules), 06 (Player module)

**Status:** done

- [ ] Every tab is reachable from the nav, which marks the current one
- [ ] Opening a show from any table, the directory or a new-episode notification lands on its show view, with cached details first
- [ ] The tray's Settings item opens settings
- [ ] Back and forward move between views
- [ ] Reloading the window on a show view shows that show again
- [ ] Playback and downloads continue uninterrupted across navigation
- [x] The view switch and its single page are gone
- [ ] `bun test` and `svelte-check` pass, and a production build runs in Tauri

## Comments

- `bun test` (51 pass), `svelte-check` (0 errors) and `bun tauri build --no-bundle` pass. The release binary wasn't launched, so the in-app boxes above are still to check by hand, reloading a show view in the release build especially, since only it uses the SPA fallback.
- Tabs stay `<button>`s that call `goto`, so the nav's styling is unchanged. Clicking the current tab does nothing.
- `openShow` in `src/lib/navigation.ts` navigates with `invalidateAll`, so reopening the open show (a notification click) reruns its load and refreshes it. The show route's `load` reads the show record and the page refreshes it. `ShowView` stays a component, keyed by slug, so another show starts with fresh filters.
- After a reload the show's title comes from the subscriptions, the directory or the episodes, with the slug standing in until one of them knows the show.
- The show view's Back goes back in history, or to the Shows tab when there's nothing to go back to.
- PlayerView, QueueView and SettingsView became their route pages.
- Behaviour change: the dashboard's "show downloaded" and the Shows tab's "hide shows" now reset when you leave the tab, as they're route state.
