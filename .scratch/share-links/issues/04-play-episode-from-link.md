# 04: Play or queue the episode from a `rinse-m8://` link

**What to build:** Opening a share link, `rinse-m8://shows/<showSlug>/<episodeId>`, plays or queues that episode, as the Play behaviour setting says, instead of opening the show view. The current view stays as it is. The show is refreshed, so an episode not yet in the cache is found. A link whose episode isn't found or has no playable mp3 reports an error.

The episode id is URL-decoded and must not be empty. It is only compared with episode ids, never put in a URL, so unlike the slug it needs no plain-character check.

**Blocked by:** 01: Open a show view from a `rinse-m8://` link

**Status:** ready-for-agent

- [x] The link parser returns the show slug and the decoded episode id, and rejects an empty id; tests cover both
- [ ] Opening a link while nothing plays plays the episode
- [ ] Opening a link while another episode plays plays, queues or asks, as the Play behaviour setting says
- [ ] A link whose episode can't be found or played reports an error
- [x] The glossary's **Share link** says the link plays or queues the episode
