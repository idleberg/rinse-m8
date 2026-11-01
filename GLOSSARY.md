# Rinse M8

A desktop app for browsing, downloading and listening to on-demand episodes from the four stations at rinse.fm.

## Language

### Browsing

**Schedule table**:
The schedule view's table of episodes that have appeared in Rinse's schedule, including ones that have since dropped out of its 7-day window.
_Avoid_: Timetable, main table

**Dashboard**:
The default view. It opens with a table of each subscribed show's newest episode, then has one section per subscribed show listing its newest episodes.
_Avoid_: Subscribed table, for you, feed

**Show directory**:
Every show Rinse lists, not only the ones in the schedule, as the Shows tab lists them. Cached and refreshed in the background once a week.
_Avoid_: Show list, artists

**Show view**:
The screen for a single show, listing its known episodes.
_Avoid_: Show page, show detail

**Image cache**:
The show view images kept on disk once loaded, indefinitely, until cleared from Settings.
_Avoid_: Thumbnail cache, bio cache

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
