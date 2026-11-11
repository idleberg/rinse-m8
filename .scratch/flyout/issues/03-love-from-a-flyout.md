# 03: Love any episode from a flyout

**What to build:** Loving stops being limited to the loaded episode: any episode can be loved or unloved, with a love going to Last.fm as it does from the player. LOVE/UNLOVE joins the flyout on the Dashboard (after MARK AS DOWNLOADED and, in Latest, SUBSCRIBE), the Schedule and the show view (after SUBSCRIBE). Favs gets the flyout, with LOVE/UNLOVE as its only entry before the defaults; unloving there drops the row from Favs. The player's love button keeps working and reflects a love made from a flyout, and the other way round.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] LOVE/UNLOVE in a flyout toggles that episode's love, whether or not it's loaded, exposed as a checkable item
- [ ] Loving from a flyout sends the love to Last.fm; unloving sends nothing, as Last.fm has no unlove
- [ ] The player's love button and the flyout entry agree for the loaded episode
- [ ] Favs rows end with Play, Show in folder (or Download) and the flyout trigger
- [ ] Unloving in Favs removes the row, with no confirmation
- [ ] Loves survive a restart, as before
