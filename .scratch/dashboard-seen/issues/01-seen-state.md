# 01: Seen state replaces the downloaded filter on the dashboard

**What to build:** With auto-download on, every new episode is recorded as downloaded as soon as it appears. The dashboard hides downloaded episodes, so Latest and the show sections empty themselves. Give the dashboard its own **seen** state that downloading never sets. The dashboard then lists what the user hasn't dealt with yet, whether files download themselves or not.

An episode is seen when the user marked it seen from its flyout, or when it has been played at least once (it has a play count). Plays are derived, so nothing new is written when an episode plays. The list of seen ids is kept with the player's other per-episode state, alongside the loved ids. It is not the backend setting already called `seen`, which lists episodes that must never trigger a notification.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Latest and the show sections hide seen episodes instead of downloaded ones. Latest still picks each show's newest episode before applying the seen check.
- [ ] The dashboard checkbox "show downloaded" becomes "show seen".
- [ ] On the dashboard, the flyout item "Mark as downloaded" is replaced by a toggle modelled on Love: "Mark as seen" / "Mark as unseen". Marking a row seen hides it and moves focus to the next row's flyout trigger, as unloving does on Favs.
- [ ] The toggle is disabled when a play is what made the episode seen, since unmarking it would change nothing.
- [ ] On first launch after the upgrade, while no seen list is stored yet, the seen list starts as a copy of the downloaded record. Episodes the user already dismissed stay hidden.
- [ ] The "mark downloaded" frontend action and backend command, whose only caller was the replaced flyout item, are deleted. "Unmark downloaded" stays, because the downloads view uses it.
- [ ] GLOSSARY.md gets a **Seen** entry: marked seen from the flyout, or played at least once. The dashboard hides seen episodes unless "show seen" is ticked. Downloading never marks an episode seen. _Avoid_: read, dismissed, expired.
- [ ] Tests: toggling seen adds and removes the id and saves it; an episode with plays counts as seen.
