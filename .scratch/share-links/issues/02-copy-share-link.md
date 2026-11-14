# 02: Share with a M8 from the flyout

**What to build:** Every episode row's flyout gets a "Share with a M8" entry next to "Copy download link". It copies the episode's share link, `rinse-m8://shows/<showSlug>/<episodeId>` with both parts URL-encoded, to the clipboard. The link uses the episode id, not its slug, because the slug can be missing on older cached episodes. Add **Share link** to the glossary under Browsing.

**Blocked by:** None (can start immediately). The link format is fixed, but the copied link only opens the app once 01 lands.

**Status:** ready-for-agent

- [x] "Share with a M8" appears in every row's flyout, beside "Copy download link"
- [x] Choosing it puts the episode's share link on the clipboard
- [x] A test checks that a share link parses back to the episode's show slug (using 01's parser once it exists)
- [x] The glossary defines **Share link**

## Comments

01's parser, `share_link_show`, is in Rust, so the TS test in `episodes.test.ts` can't call it. It parses the link with `URL` and reads the host and the first path segment, as `share_link_show` does.
