# 25: Sticky filters

**What to build:** The filter checkboxes (stations, "download available", "hide rebroadcasts") stay pinned at the top of the page while the episodes scroll under them, on the dashboard, the schedule view and the show view. The dashboard and schedule filters are also remembered across restarts. The search input is neither pinned nor remembered: it scrolls with the page and starts empty on every launch.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The filter checkboxes stay visible at the top while scrolling the dashboard, the schedule view and the show view
- [ ] The search input scrolls away with the page
- [ ] The dashboard and schedule filters keep their values after a restart
- [ ] The search input starts empty after a restart
- [ ] Without remembered values, the filters start with today's defaults
- [ ] Manual check: untick a station, scroll the schedule and see the checkboxes stay put, restart and find the station still unticked
