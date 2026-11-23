# Rinse M8

A desktop app for browsing, downloading and listening to on-demand episodes from the four stations at rinse.fm.

## Language

### Browsing

**Schedule table**:
The schedule view's table of episodes that have appeared in Rinse's schedule, including ones that have since dropped out of its 7-day window.
_Avoid_: Timetable, main table

**Dashboard**:
The default view. It opens with a table of each subscribed show's newest episode, then has one section per subscribed show listing its newest episodes, in the show order set in Settings.
_Avoid_: Subscribed table, for you, feed

**Subscribe**:
Follow a show, so its new episodes appear on the Dashboard and trigger a notification. Subscribing never downloads anything; that is auto-download.
_Avoid_: Follow, favourite

**Auto-download**:
Putting a subscribed show's new episodes in the download queue as they appear. Set in Settings to Off, Selected shows or All subscribed shows, and separate from subscribing. With Selected shows, each show is enabled from its flyout; the flag outlives an unsubscribe.
_Avoid_: Automatic subscription, sync

**Seen**:
An episode marked seen from its flyout. In Latest, also one as old as the Seen after setting; the show sections ignore that setting. The dashboard hides seen episodes unless "show seen" is ticked. Playing or downloading never marks an episode seen.
_Avoid_: Read, dismissed, expired

**Show directory**:
Every show Rinse lists, not only the ones in the schedule, as the Shows tab lists them. Cached and refreshed in the background once a week.
_Avoid_: Show list, artists

**Show view**:
The screen for a single show, listing its known episodes.
_Avoid_: Show page, show detail

**Share link**:
An `m8://shows/<showSlug>/<episodeId>` link, copied with "Share with M8" in an episode's flyout, that plays or queues the episode in Rinse M8, as the Play behaviour setting says.
_Avoid_: Deep link, app link, invite

**Show record**:
What the app keeps about a show between runs: its image and description from the last show view refresh, and its recorded last aired date. Lets a show view open instantly.
_Avoid_: Show cache, show details

**Last aired**:
The date of a show's newest known episode: the later of the seed bundled with the release and the date in its show record. Unknown for a show in neither. The Shows tab can sort by it, freshest first.
_Avoid_: Last episode, latest date

**Image cache**:
The show view images kept on disk once loaded, indefinitely, until cleared from Settings.
_Avoid_: Thumbnail cache, bio cache

**Image style**:
How artwork looks in the Player tab and the show view: Original, Dithered (Atkinson-dithered black and white) or Black & white (grayscale). Styled copies are made from the image cache's originals and kept beside them.
_Avoid_: Filter, image mode, theme

### Look

**Theme**:
The named look picked in Settings, such as Asciitron or Graphics: a stylesheet that can change the colour tokens and restyle the theme parts. Works with every appearance. Image style is not a theme. Set as `data-skin` on the root, since `data-theme` already holds the appearance.
_Avoid_: Style

**Appearance**:
Light, dark, or following the system, as set by the toggle in Settings. Independent of the theme.
_Avoid_: Theme, colour scheme, mode

**Theme part**:
An element a theme may restyle, from the fixed list in `docs/theming.md`, such as the tab bar, a tab or the player bar. Renaming one breaks custom stylesheets.
_Avoid_: Component, slot

### Queues

**Play queue**:
The ordered list of episodes the player plays next.
_Avoid_: Queue, playlist

**Download queue**:
The ordered list of episodes waiting to be downloaded, worked strictly one at a time.
_Avoid_: Queue, downloads

**Queue view**:
The view listing the download queue: the running download with its progress, the waiting ones, and the last failure.
_Avoid_: Downloads view, queue page

### Listening

**Player tab**:
The tab showing the loaded episode's cover, the same controls as the bottom bar, and the play queue below them.
_Avoid_: Now playing, player page

### Tables

**Flyout**:
The menu holding a table row's less common actions, so a row shows at most three buttons.
_Avoid_: Row menu, actions menu, overflow menu, context menu

**Flyout trigger**:
The last button in a table row, which opens its flyout.
_Avoid_: More button, kebab, ellipsis button
