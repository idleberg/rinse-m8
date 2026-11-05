# 01: Show order setting with alphabetical sorting

**What to build:** A "Show order" menu in Settings, under General, sets the order of the show sections on the Dashboard. It offers Subscription date and Alphabetical. Subscription date is the default and keeps today's order, the order the shows were subscribed to. Alphabetical sorts the sections A–Z by show title. The Latest table stays on top, and the episodes inside each section keep their order. The choice is saved in the settings store like Image style, so it survives a restart.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Settings → General has a "Show order" menu with Subscription date and Alphabetical
- [x] The choice is saved in the settings store and is still set after a restart
- [x] A settings store saved before this change loads with Subscription date
- [x] Subscription date shows the Dashboard's show sections in subscription order
- [x] Alphabetical sorts the Dashboard's show sections A–Z by show title, ignoring case
- [x] The Latest table stays first, and the episode order inside each section is unchanged
- [x] The Dashboard entry in the glossary says the section order is set in Settings
