# 26: Sortable columns

**What to build:** Clicking a column heading (Date, Station, Show, Title) sorts that table by the column, and clicking it again reverses the order. Every table sorts on its own, including each show's section on the dashboard. Tables start newest first, as today. A dashboard section sorts before taking its first 5, so it shows the top 5 by the chosen column.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Clicking Date, Station, Show or Title sorts the table by that column; clicking it again reverses the order
- [ ] Each table, and each dashboard section, keeps its own sort
- [ ] Tables start sorted newest first
- [ ] The sorted heading is marked for assistive tech
- [ ] A dashboard section shows its first 5 episodes in the chosen order, and "SHOW ALL (n)" keeps that order
- [ ] Unit test: the default order is newest first, a column sort ascends, and clicking again reverses it
- [ ] Manual check: sort the schedule by title, then one dashboard section by station, and see each table keep its own order
