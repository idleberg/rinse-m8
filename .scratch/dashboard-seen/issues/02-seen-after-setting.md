# 02: "Seen after" setting

**What to build:** A setting that makes an episode count as seen once it reaches a chosen age, so the dashboard stops listing old episodes without the user marking each one. Age is worked out from the episode's (London) date, so nothing is written as episodes age.

**Blocked by:** 01: Seen state replaces the downloaded filter on the dashboard

**Status:** ready-for-agent

- [ ] Settings has a "Seen after" dropdown in the Library section. Its options are never (the default), 1 week, 2, 4, 8 and 12 weeks. It is stored in weeks, with 0 meaning never.
- [ ] The backend saves it like the other settings. Settings saved before this change load with never.
- [ ] With a value set, an episode dated that many weeks ago or earlier counts as seen, and the dashboard hides it unless "show seen" is ticked. Choosing never brings those episodes back.
- [ ] "Mark as unseen" is disabled for an episode that counts as seen only because of its age.
- [ ] The GLOSSARY.md **Seen** entry also mentions episodes older than the Seen after setting.
- [ ] Tests: the week-based date calculation gives the correct London date across a month boundary; age-based seen applies with the setting on and not with it off.
