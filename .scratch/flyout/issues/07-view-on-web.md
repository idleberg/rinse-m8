# 07: View on web

**What to build:** Episodes carry their Rinse episode slug, taken from the API alongside the rest. VIEW ON WEB joins the default section, above COPY DOWNLOAD LINK, and opens the episode's page on rinse.fm in the default browser. An episode cached before this change has no slug, so it opens its show's page instead.

**Blocked by:** 06

**Status:** ready-for-agent

- [x] Episodes fetched from the schedule and show pages carry their episode slug
- [x] An episode cache saved before this change still loads, with no slug on its episodes
- [ ] VIEW ON WEB opens the episode page in the default browser
- [x] For an episode without a slug it opens the show page
- [x] It sits first in the default section, above COPY DOWNLOAD LINK
- [x] The episode and show page URL shapes are checked against rinse.fm
