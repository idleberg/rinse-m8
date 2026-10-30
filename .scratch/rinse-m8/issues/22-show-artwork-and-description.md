# 22: Show view artwork and description

**What to build:** Opening a show's show view fetches the show's image and description along with its episodes, and the header displays them when Rinse provides them. The show API's `entry` carries an HTML `description` and a `featuredImage` filename; the full image URL is the Rinse asset bucket's `images/` path plus that filename (verified to resolve). The description is shown as plain-text paragraphs only, never as HTML from Rinse, because the webview can call the app's commands.

**Blocked by:** 19 (Views as tabs)

**Status:** ready-for-agent

- [ ] Opening a show fetches its image and description in the same request as its episodes
- [ ] The show view's header shows the image and the description when present, and nothing broken when either is missing
- [ ] The description is rendered as plain text paragraphs; no markup from Rinse is injected
- [ ] Subscribing and the background poller keep working unchanged
- [ ] Unit test: mapping the show fixture yields the expected image URL and a description
- [ ] Manual check: open a show with artwork; the image and description appear after the fetch
