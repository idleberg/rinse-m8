# 39: Update episodes on full hours

**What to build:** While the app runs, including hidden in the menu bar, it updates the schedule and every subscribed show together. Each update runs on a full hour, once the update interval has passed since the last one. It also runs once at startup, as now. The interval is a stored setting in hours, 6 by default. After every update, the Dashboard and Schedule views show the fresh episodes without a reload, also when nothing new was found. Notifications and auto-download work as before, at the new cadence. A changed interval applies from the next full hour. This replaces the 15-minute subscription check.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] An empty settings store has an update interval of 6 hours
- [ ] With the interval due, the schedule and subscribed shows are fetched on the full hour, and both views update without a reload
- [ ] An update that lands a few seconds past the hour doesn't push the next one back by an hour
- [ ] New episodes of subscribed shows still notify and auto-download, once each
- [ ] Changing the stored interval takes effect at the next full hour, without a restart
