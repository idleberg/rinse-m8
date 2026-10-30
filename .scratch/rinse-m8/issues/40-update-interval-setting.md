# 40: Choose the update interval in Settings

**What to build:** Settings gets an "Updates" row with a select offering every 1, 6, 12, 24 or 48 hours. The choice is saved, kept across restarts, and applies from the next full hour. If saving fails, the select goes back to the stored value and the error shows. The select is a native control styled to match the app: bordered, uppercase, with a chevron in the text colour. It follows the theme, including the inverted Settings page. The style is global, so any later select gets it too.

**Blocked by:** 39: Update episodes on full hours

**Status:** ready-for-agent

- [ ] Settings shows the update interval, 6 hours on a fresh install
- [ ] Picking another interval saves it, and it's still picked after a restart
- [ ] A failed save puts the stored interval back and shows the error
- [ ] The select and its chevron follow light, dark and the inverted Settings page
- [ ] The select is keyboard-operable and has an accessible name
