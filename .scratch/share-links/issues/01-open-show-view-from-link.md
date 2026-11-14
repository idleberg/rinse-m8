# 01: Open a show view from a `rinse-m8://` link

**What to build:** The app registers the `rinse-m8` URL scheme. Opening a share link of the form `rinse-m8://shows/<showSlug>/<episodeId>` brings the window forward and opens that show's show view. That works whether the app is already running or not: a link that launches the app must not be lost before the frontend is listening. The episode id is part of the format but is not used yet; it's reserved so shared links keep working if highlighting the episode's row is added later.

The link is untrusted input, and the show slug ends up in a Rinse API URL. So a link with any other host, a missing slug, or a slug that isn't plain must do nothing. A plain slug, once URL-decoded, is lowercase letters and digits in any script, `-` and `.`, but not `.` or `..` alone, so `/`, `%2F` and `?` are rejected. Real Rinse slugs include `chloé-caillet`, `lysiane-n.` and `ڭليثر-glitter-٥٥`.

Use Tauri's deep-link plugin. Bring the window forward with the existing helper that notification clicks use, and navigate with the existing open-show navigation.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] With a bundled macOS build running, `open 'rinse-m8://shows/<slug>/<id>'` brings the window forward and opens that show view
- [ ] With the app quit, the same command launches it and opens that show view
- [ ] `open 'rinse-m8://shows/../x/1'` and links with other hosts do nothing
- [ ] The link parser has tests: it accepts a valid link and rejects a wrong host, a missing slug, and `..`, `/` or `%2F` in the slug

## Comments

The deep-link plugin hands over links already parsed as `url::Url`, which resolves `..` and `%2E%2E` segments at parse time. `rinse-m8://shows/../x/1` therefore arrives as `rinse-m8://shows/x/1` and opens show `x`, and the raw `..` can't be seen. The traversal is gone and the slug still has to be plain, so nothing reaches the API outside a plain slug. The `..` criteria (the third box and the `..` part of the fourth) can't be met as written. Relax them, or decide on another approach. The parser tests record the resolved behaviour in `a_dot_dot_segment_resolves_before_it_reaches_the_slug`.
