# Rinse M8

Status: ready-for-agent

## Problem Statement

I listen to shows on the four stations at rinse.fm: Rinse FM, Rinse FR, Kool FM and SWU FM. The website makes it hard to see what's been on across all four, to find which episodes have a downloadable mp3, and to keep up with the shows I follow. I have to check back manually to learn whether a new episode has been uploaded, and download each one by hand. Listening in the browser loses my place in a 2–3 hour mix as soon as I close the tab. Three earlier attempts at this app (a browser extension, an Electrobun app, and this Tauri template) all stalled at the same point: getting and understanding Rinse's data.

## Solution

Rinse M8 is a desktop app (Tauri). It shows recent episodes from all four stations in one simple table that you can filter by station, by mp3 availability, by rebroadcast status and by free text, and every available episode can be downloaded in one click. You can subscribe to a show. While the app is running it checks for new episodes and sends a native OS notification when one has an mp3, and can optionally download it automatically to a folder you choose. A small built-in player streams episodes, keeps a queue, and remembers where you were in each episode across app restarts.

The data comes from the public JSON API that the rinse.fm frontend itself uses. It needs no authentication.

## User Stories

1. As a listener, I want to see episodes from Rinse FM, Rinse FR, Kool FM and SWU FM in one table, so that I don't have to browse four station pages.
2. As a listener, I want each row to show date, time, station, show, episode title and whether it's a rebroadcast, so that I can scan quickly.
3. As a listener, I want dates and times shown as broadcast in London time, so that they match the Rinse schedule.
4. As a listener, I want to toggle each station with a checkbox, so that I can focus on the stations I care about.
5. As a listener, I want an "mp3 available only" filter that's on by default, so that I only see episodes I can actually play or download.
6. As a listener, I want a "hide rebroadcasts" filter, so that I don't see the same show twice.
7. As a listener, I want a "subscribed only" filter, so that I can see just the shows I follow.
8. As a listener, I want a text filter that matches episode title, show name and genres, so that I can find something specific fast.
9. As a listener, I want filters to apply instantly as I type or click, so that the table feels responsive.
10. As a listener, I want episodes I've seen before to stay in the table even after they drop off Rinse's 7-day schedule, so that my history grows over time.
11. As a listener, I want to refresh a single show and pull its last ~30 episodes, so that I can get older episodes of a show I just discovered.
12. As a listener, I want a download button on every available episode, so that I can save the mp3 locally.
13. As a listener, I want to pick a download folder the first time I download, so that I don't have to configure anything up front.
14. As a listener, I want downloaded files named `<Show> - <YYYY-MM-DD>.mp3`, so that my folder stays readable and sorted.
15. As a listener, I want downloads to stream to disk rather than load into memory, so that 280 MB files don't stall the app.
16. As a listener, I want to subscribe and unsubscribe to a show from any of its rows, so that following a show is one click.
17. As a subscriber, I want episodes that already exist when I subscribe to not trigger notifications, so that subscribing doesn't flood me.
18. As a subscriber, I want a native OS notification when a subscribed show gets a new episode with an mp3, so that I know without checking.
19. As a subscriber, I want the notification to name the show and the broadcast date, so that I know what it is at a glance.
20. As a subscriber, I want an "auto-download" setting, so that new episodes of subscribed shows land in my folder without me doing anything.
21. As a subscriber, I want the app to check for new episodes at startup and then every 15 minutes, so that notifications arrive reasonably soon after upload.
22. As a subscriber, I want each new episode to notify me only once, even across restarts, so that I'm not nagged.
23. As a subscriber, I want the table to update by itself when the background check finds new episodes, so that I don't have to reload.
24. As a listener, I want to play an episode in the app with one click, so that I don't need a separate player.
25. As a listener, I want playback to stream the remote mp3 and let me seek anywhere, so that I don't have to download first.
26. As a listener, I want to add episodes to a queue, so that I can line up a listening session.
27. As a listener, I want the next queued episode to start when the current one ends, so that playback continues hands-free.
28. As a listener, I want to reorder and remove queue items, so that I can change my mind.
29. As a listener, I want the queue to persist across restarts, so that my session survives quitting the app.
30. As a listener, I want my position in each episode remembered, so that I can resume a long mix where I left off.
31. As a listener, I want the last-played episode restored (paused, at its saved position) when I launch the app, so that I can just press play.
32. As a user, I want the window and app to be called "Rinse M8", so that it's recognizable in my dock and task switcher.
33. As a user, I want settings (download folder, auto-download, subscriptions) to persist, so that I configure them once.
34. As a developer, I want the dependency stack brought up to date and on a single package manager (bun) before feature work, so that features aren't built on a stale template.

## Implementation Decisions

**Prefactor: dependency refresh (must land first, blocks everything else)**
- Switch to bun as the only package manager. Remove the Deno and pnpm lockfiles. Update every JS dependency (Svelte, SvelteKit, Vite, svelte-check, TypeScript, the Tauri JS packages) to latest and fix any config breakage.
- Run `cargo update` and bump reqwest to latest with JSON and streaming support. Replace the deprecated Tauri shell plugin with the opener plugin. Add the notification, store and dialog plugins, tokio (timers), and a futures stream helper.
- The Tauri config uses bun for its dev/build hooks. The product name and window title are "Rinse M8".
- Remove the template leftovers: the `greet` command, the loader component stub, and the template README.
- Done when the app launches to an empty window and type-check passes.

**Data source contract (researched live 2026-10-29)**
- Schedule: `GET https://www.rinse.fm/api/query/v1/schedule` returns `{episodes, channels, eventTakeovers}`, roughly 200 episodes covering about 7 days across all four stations.
- Show: `GET https://www.rinse.fm/api/query/v1/shows/<slug>` returns `{entry, episodes}`, about 30 recent episodes, newest first.
- Plain GETs with no cookies or headers. There's no full-archive endpoint. The admin Craft GraphQL at admin.rinse.fm exposes the whole archive but is deliberately not used because it's unofficial.
- Raw episode fields used: `id`, `title`, `episodeDate`, `episodeTime`, `episodeLength`, `isRebroadcast`, `genreTag`, `fileUrl`, `channel[0].slug`, `parentShow[0]` (`id`, `slug`, `title`).

**Domain rules (the hard-won part, encode exactly)**
- An episode is **available** only when `fileUrl` ends in `.mp3`. Treat null and placeholders such as `https://replay.rinse.fm/uk/` (a bare channel directory) as unavailable.
- The **broadcast date** comes from `episodeDate`, which is London midnight expressed in UTC: `2026-10-13T23:00Z` means 14 Oct. The **time of day** comes from `episodeTime`, whose date part is junk (always today) and must be ignored. Format both in Europe/London.
- The **station** comes from `channel[0].slug`: `uk` → Rinse FM, `france` → Rinse FR, `kool` → Kool FM, `swu` → SWU FM.
- The **show** is `parentShow[0]`.
- The mp3s on replay.rinse.fm are served as `audio/mpeg` with byte ranges, about 280 MB each, so they can be streamed and seeked directly.

**Rinse data module (Rust, deep module, the main test seam)**
- A flat `Episode` type: id, title, show id/slug/title, station, date, time, length, rebroadcast flag, genres, and an optional mp3 URL that is set only when available.
- A pure mapping from a raw schedule response to episodes, and from a raw show response to episodes. No I/O, so fixtures can drive it.
- Thin fetchers for the schedule and a show that call the mapping.
- A pure **new-episode check**: given the subscriptions, the seen-id set and the fetched episodes, it returns the available episodes of subscribed shows whose ids aren't in seen. Notification, download and seen-marking are all driven from its output.

**Persistence (tauri store plugin, three files)**
- The episode cache maps id → Episode, and every fetch merges into it. It's unbounded on purpose; prune by age if it grows large.
- Settings hold the subscriptions (slug and title), the seen episode ids, the download folder (optional) and the auto-download flag.
- Player state holds the queue (a list of episodes), the per-episode playback positions (id → seconds) and the last-played id.

**Tauri command surface**
- Episodes: `get_episodes` returns the cache merged with a fresh schedule fetch. `refresh_show(slug)` merges that show's episodes into the cache.
- Downloads: `download(episode)` streams to disk. When no folder is set, the frontend asks for one first using the dialog plugin.
- Subscriptions: `subscribe(slug, title)` also marks all of the show's currently available episodes as seen, fetching the show first. `unsubscribe(slug)`.
- Settings: `get_settings` and `set_settings`.
- Event: `episodes-updated` is emitted after a background check adds anything.

**Background poller**
- A tokio task spawned at app setup runs once immediately and then every 15 minutes. For each subscription it fetches the show, runs the new-episode check, and for each result sends a native notification ("New: <Show> – <dd/mm>"), downloads the file if auto-download is on, and adds the id to seen. Then it emits `episodes-updated`.
- It only runs while the app is open.

**Table UI (single Svelte page)**
- One table with columns: Date, Time, Station, Show, Title, Rebroadcast badge, plus actions (play, queue, download, subscribe toggle).
- Filters: four station checkboxes; mp3 available only (on by default); hide rebroadcasts; subscribed only; free text over title, show and genres. All filtering is a derived value over the episode list, with no table or filter library.

**Player (one Svelte component, bottom bar)**
- A native `<audio>` element pointed at the remote mp3.
- The queue appends, auto-advances when a track ends, and supports reorder and remove.
- The position is saved on `timeupdate`, throttled to about 5 s, and restored when an episode loads. At launch the last-played episode is restored paused.

**Capabilities**
- The default capability grants core, opener, notification, dialog and store permissions.

## Testing Decisions

- Good tests check external behavior through the module's public functions: raw JSON in, `Episode` values out, and subscriptions, seen and episodes in, new episodes out. They never assert on private helpers or intermediate structs, and never hit the network.
- **Seam 1, JSON mapping:** a saved live schedule response is checked in as a fixture. The tests assert that:
  - placeholder and null file URLs map to no mp3, and real `.mp3` URLs are kept;
  - all four station slugs map to the right station names;
  - show id, slug and title are populated;
  - `2026-10-13T23:00Z`-style dates come out as the London date (14 Oct);
  - the time comes from `episodeTime`, not from its junk date.
  A small show-response fixture covers the show mapping.
- **Seam 2, new-episode check:** the input is built in the test. The tests assert that:
  - an unseen available episode of a subscribed show is returned;
  - seen episodes, unavailable episodes and episodes of unsubscribed shows are not returned.
- Both seams live in the Rust data module and run under `cargo test`. There's no prior art in the repo yet, so these are the first tests.
- The UI, player, notifications and downloads get manual verification only:
  - the table fills with episodes from all four stations, and the filters narrow it;
  - removing a seen id and restarting fires a notification, plus an auto-download if that's enabled;
  - after seeking, quitting and relaunching, playback resumes, and the queue auto-advances.
- Frontend type-check (`bun run check`) must pass.

## Out of Scope

- The full Rinse archive, or any use of the admin Craft GraphQL endpoint.
- Background polling while the app is closed: tray mode and launch-at-login.
- Live radio streams. Only on-demand mp3 replays are covered.
- Download progress UI, resumable or partial downloads, and a download queue.
- Cache pruning or eviction.
- Frontend unit tests and end-to-end tests.
- Reusing any code from the earlier rinse-m8 extension or the electrobun-rinse-m8 attempt.
- Mobile targets.

## Further Notes

- Today the template page calls a `fetch_schedule` command that doesn't exist. The table page replaces it.
- The repo isn't a git repository yet. Run `git init` before ticketed work, especially if `/implement-spec` will use an integration branch.
- Rinse's API is unofficial in the sense that it's undocumented, even though it's public. If it breaks, the fixture tests pin down exactly what shape the app expects.
