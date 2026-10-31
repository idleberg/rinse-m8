# 40: Choose the update interval in Settings

**What to build:** Settings gets an "Updates" row with a select offering every 1, 6, 12, 24 or 48 hours. The choice is saved, kept across restarts, and applies from the next full hour. If saving fails, the select goes back to the stored value and the error shows. The select is a native control styled to match the app: bordered, uppercase, with a chevron in the text colour. It follows the theme, including the inverted Settings page. The style is global, so any later select gets it too.

**Blocked by:** 39: Update episodes on full hours

**Status:** done

- [x] Settings shows the update interval, 6 hours on a fresh install
- [ ] Picking another interval saves it, and it's still picked after a restart
- [ ] A failed save puts the stored interval back and shows the error
- [ ] The select and its chevron follow light, dark and the inverted Settings page
- [x] The select is keyboard-operable and has an accessible name

## Comments

- Frontend only: the store field, its default and the hourly re-read landed with 39.
- The chevron is two `currentColor` gradient strokes, so it follows whatever colour the select inherits.
- Not checked in the running app yet: the restart, the failed-save revert, and the select across the three themes.
