# Rinse M8

Status: ready-for-agent

## Problem Statement

I listen to shows on the four stations at rinse.fm: Rinse FM, Rinse FR, Kool FM and SWU FM. The website makes it hard to see what's been on across all four, to find which episodes have a downloadable mp3, and to keep up with the shows I follow. I have to check back manually to learn whether a new episode has been uploaded, and download each one by hand. Listening in the browser loses my place in a 2–3 hour mix as soon as I close the tab. Three earlier attempts at this app (a browser extension, an Electrobun app, and this Tauri template) all stalled at the same point: getting and understanding Rinse's data.

## Solution

Rinse M8 is a desktop app (Tauri). Its main view shows two tables under one filter bar: the subscribed table, with episodes from the shows you follow, and the schedule table, with recent episodes from all four stations. You can filter by station, by mp3 availability, by rebroadcast status and by free text. Clicking a show opens its show view with that show's episodes. Every available episode can be downloaded in one click; downloads wait in a download queue and run one at a time, with their progress shown in a footer, and they resume after an interruption or a restart. While the app is running it checks for new episodes and sends a native OS notification when one has an mp3, and can optionally download it automatically to a folder you choose. A small built-in player streams episodes, keeps a play queue, and remembers where you were in each episode across app restarts.

The data comes from the public JSON API that the rinse.fm frontend itself uses. It needs no authentication.

## User Stories

1. As a listener, I want to see episodes from Rinse FM, Rinse FR, Kool FM and SWU FM in one table, so that I don't have to browse four station pages.
2. As a listener, I want each row to show date, time, station, show, episode title and whether it's a rebroadcast, so that I can scan quickly.
3. As a listener, I want dates and times shown as broadcast in London time, so that they match the Rinse schedule.
4. As a listener, I want to toggle each station with a checkbox, so that I can focus on the stations I care about.
5. As a listener, I want an "mp3 available only" filter that's on by default, so that I only see episodes I can actually play or download.
6. As a listener, I want a "hide rebroadcasts" filter, so that I don't see the same show twice.
7. As a listener, I want a subscribed table above the schedule table, so that I can see just the shows I follow. (This replaced an earlier "subscribed only" filter.)
8. As a listener, I want a text filter that matches episode title, show name and genres, so that I can find something specific fast.
9. As a listener, I want filters to apply instantly as I type or click, so that the table feels responsive.
10. As a listener, I want episodes I've seen before to stay in the table even after they drop off Rinse's 7-day schedule, so that my history grows over time.
11. As a listener, I want opening a show's show view to pull its last ~30 episodes, so that I can get older episodes of a show I just discovered.
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
26. As a listener, I want to add episodes to a play queue, so that I can line up a listening session.
27. As a listener, I want the next episode in the play queue to start when the current one ends, so that playback continues hands-free.
28. As a listener, I want to reorder and remove play queue items, so that I can change my mind.
29. As a listener, I want the play queue to persist across restarts, so that my session survives quitting the app.
30. As a listener, I want my position in each episode remembered, so that I can resume a long mix where I left off.
31. As a listener, I want the last-played episode restored (paused, at its saved position) when I launch the app, so that I can just press play.
32. As a user, I want the window and app to be called "Rinse M8", so that it's recognizable in my dock and task switcher.
33. As a user, I want settings (download folder, auto-download, subscriptions) to persist, so that I configure them once.
34. As a developer, I want the dependency stack brought up to date and on a single package manager (bun) before feature work, so that features aren't built on a stale template.
35. As a listener, I want to click a show name in any row to open its show view, so that I can browse one show's episodes.
36. As a listener, I want the show view to have a subscribe toggle and the mp3-only and hide-rebroadcasts filters, so that I can decide on a show while browsing it.
37. As a listener, I want the schedule table to list only episodes that appeared in Rinse's schedule, so that browsing a show doesn't flood it with old episodes.
38. As a listener, I want subscribing to show the show's recent episodes in the subscribed table at once, so that I don't wait for the next background check.
39. As a listener, I want downloads to run one at a time in the order I started them, so that Rinse doesn't penalise me for parallel downloads.
40. As a listener, I want each row's download button to show whether its episode is queued, downloading (with a percent) or failed, so that I know what's happening to it.
41. As a listener, I want a footer that shows the current download, its progress and how many are queued, so that I can see download activity from anywhere in the app.
42. As a listener, I want an interrupted download to resume where it stopped instead of starting over, so that a dropped connection doesn't waste a 280 MB transfer.
43. As a listener, I want queued downloads to continue after I restart the app, so that quitting doesn't lose them.

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
- Rinse penalises users who download in parallel, so the app never downloads more than one file at a time.
- A resumed download is trusted only when the server answers `206` with a `Content-Range` that starts at the requested offset, and a finished file must match the total size the server reported.

**Rinse data module (Rust, deep module, the main test seam)**
- A flat `Episode` type: id, title, show id/slug/title, station, date, time, length, rebroadcast flag, genres, and an optional mp3 URL that is set only when available.
- A pure mapping from a raw schedule response to episodes, and from a raw show response to episodes. No I/O, so fixtures can drive it.
- Thin fetchers for the schedule and a show that call the mapping.
- A pure **new-episode check**: given the subscriptions, the seen-id set and the fetched episodes, it returns the available episodes of subscribed shows whose ids aren't in seen. Notification, download and seen-marking are all driven from its output.
- A pure **resume decision**: given the partial file's size and the server's status and `Content-Range`, it decides whether to append or to start over.

**Persistence (tauri store plugin, four files)**
- The episode cache maps id → Episode, and every fetch merges into it. Each entry records whether it has appeared in the schedule feed; a show fetch never clears that mark, and entries from before the mark existed count as schedule episodes. It's unbounded on purpose; prune by age if it grows large.
- Settings hold the subscriptions (slug and title), the seen episode ids, the download folder (optional) and the auto-download flag.
- Player state holds the play queue (a list of episodes), the per-episode playback positions (id → seconds) and the last-played id.
- The download queue holds the pending downloads in order, each with the download folder it was queued with, including the one in progress.

**Tauri command surface**
- Episodes: `get_episodes` returns the cache merged with a fresh schedule fetch. `refresh_show(slug)` merges that show's episodes into the cache; the show view calls it when it opens.
- Downloads: `download(episode)` adds the episode to the download queue, and does nothing if it's already there. When no folder is set, the frontend asks for one first using the dialog plugin.
- Subscriptions: `subscribe(slug, title)` fetches the show, merges its episodes into the cache and marks all of its currently available episodes as seen. `unsubscribe(slug)`.
- Settings: `get_settings` and `set_settings`.
- Events: `episodes-updated` is emitted after a background check adds anything. The download queue reports its contents, the current download's progress and the last failure to the frontend.

**Download queue (backend)**
- A single worker downloads one episode at a time, first in, first out. Manual downloads and auto-downloads go through it.
- A download writes into `<Show> - <YYYY-MM-DD>.mp3.part` and renames it to `.mp3` once complete. An existing `.part` file is resumed with a byte-range request, following the resume rule above.
- A failed download leaves the queue and keeps its `.part` file, so downloading it again resumes. There's no automatic retry.
- The download queue is saved whenever it changes and starts again by itself at launch.

**Background poller**
- A tokio task spawned at app setup runs once immediately and then every 15 minutes. For each subscription it fetches the show, runs the new-episode check, and for each result sends a native notification ("New: <Show> – <dd/mm>"), adds the episode to the download queue if auto-download is on, and adds the id to seen. Then it emits `episodes-updated`.
- It only runs while the app is open.

**UI (Svelte components composed by one page)**
- The page holds the shared state and the current view (main view or show view), and composes the components below. None of the components assume where they're placed, so the layout can be redesigned freely.
- `EpisodeTable` renders a list of episodes with columns Date, Time, Station, Show, Title, Rebroadcast badge, plus actions (play, add to play queue, download, subscribe toggle). Clicking a show name opens its show view.
- `EpisodeFilters` renders the filter bar: four station checkboxes; mp3 available only (on by default); hide rebroadcasts; free text over title, show and genres. It can be configured to show only some filters. All filtering is a derived value over the episode list, with no table or filter library.
- The main view has one `EpisodeFilters` over two `EpisodeTable`s: the subscribed table first (episodes of subscribed shows, newest first, or a hint when there are no subscriptions), then the schedule table (episodes marked as schedule episodes).
- `ShowView` has a header with the show title and a subscribe toggle, a back button, an `EpisodeFilters` limited to mp3 only and hide rebroadcasts, and an `EpisodeTable` of that show's cached episodes, which refresh in the background when it opens.
- `DownloadButton` is the row's download action and shows Queued, the percent, or Failed.
- `DownloadStatus` is a sticky footer, hidden when idle, that shows the current download, its percent and the queued count, or the last failure until it's dismissed or the next download starts.

**Player (one Svelte component, bottom bar)**
- A native `<audio>` element pointed at the remote mp3.
- The play queue appends, auto-advances when a track ends, and supports reorder and remove.
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
- **Seam 3, cache merge:** merging a show fetch over a schedule episode keeps its schedule mark, and a show-only episode stays unmarked.
- **Seam 4, resume decision:** `206` with a matching `Content-Range` start resumes, while `200`, or `206` with a different start, restarts.
- All seams live in the Rust backend and run under `cargo test`.
- The UI, player, notifications and downloads get manual verification only:
  - the tables fill with episodes from all four stations, and the filters narrow them;
  - opening a show view pulls in its older episodes, and they don't appear in the schedule table;
  - removing a seen id and restarting fires a notification, plus an auto-download if that's enabled;
  - several downloads started together run one after another, a download interrupted by a network drop resumes, and queued downloads continue after a restart;
  - after seeking, quitting and relaunching, playback resumes, and the play queue auto-advances.
- Frontend type-check (`bun run check`) must pass.

## Out of Scope

- The full Rinse archive, or any use of the admin Craft GraphQL endpoint.
- Background polling while the app is closed: tray mode and launch-at-login.
- Live radio streams. Only on-demand mp3 replays are covered.
- Cancelling downloads, automatic retry of failed downloads, and cleanup of leftover `.part` files.
- Show descriptions or artwork in the show view.
- Cache pruning or eviction.
- Frontend unit tests and end-to-end tests.
- Reusing any code from the earlier rinse-m8 extension or the electrobun-rinse-m8 attempt.
- Mobile targets.

## Further Notes

- Today the template page calls a `fetch_schedule` command that doesn't exist. The table page replaces it.
- The repo isn't a git repository yet. Run `git init` before ticketed work, especially if `/implement-spec` will use an integration branch.
- Rinse's API is unofficial in the sense that it's undocumented, even though it's public. If it breaks, the fixture tests pin down exactly what shape the app expects.
