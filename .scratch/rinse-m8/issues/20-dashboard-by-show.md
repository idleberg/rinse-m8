# 20: Dashboard groups episodes by show

**What to build:** The dashboard shows one section per subscribed show instead of one flat table. Each section's heading is the show title, which opens the show view. A section lists at most 5 of the show's filtered episodes, newest first, with a "SHOW ALL (n)" control that expands it to all of them and collapses it again.

**Blocked by:** 19 (Views as tabs)

**Status:** ready-for-agent

- [ ] Each subscribed show has its own section on the dashboard
- [ ] Clicking a section heading opens that show's show view
- [ ] Each section shows at most 5 episodes by default
- [ ] "SHOW ALL (n)" expands a section to all its episodes and can collapse it again
- [ ] A show with no episodes matching the filters still has a section, saying so
