# 47: Update banner with a fake update for design review

**What to build:** When an update is available, a banner appears above the tabs and spans the full window width. It has a blue background with white text: "Version X is available". Its actions sit on the right: Update, then Dismiss, spaced like the other button groups (0.5ch). Update replaces the actions with a progress bar and percentage, styled like the download status bar. Dismiss hides the banner for the session. Dismiss starts as a text button; the × icon button variant gets compared afterwards, and the user decides. In development only, a fake-update switch shows the banner with version 9.9.9 and a simulated download that stops at 100% without relaunching. Release builds don't contain the fake. There's no real updater yet.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] With the fake-update switch on in dev, the banner shows above the tabs, full width, blue
- [x] Update and Dismiss are spaced like the existing button groups
- [x] Update shows simulated progress up to 100%
- [x] Dismiss hides the banner until the next launch
- [x] A blue colour token is defined for the light and dark themes
- [x] The fake is absent from a release build
- [x] Manual check: review the design in both themes and at narrow width, try the × variant, and pick one

## Comments

- Implemented in `src/lib/UpdateBanner.svelte`, wired in `src/routes/+page.svelte`, with `--info` in `src/app.css`. Run `mise run dev:update` to show the fake 9.9.9 update.
- The fake is gated on `import.meta.env.DEV`. A `vite build` with `VITE_FAKE_UPDATE=1` contains no `9.9.9`.
- The first four boxes are in code but haven't been checked in the running app, so they stay with the manual check.
- Text is uppercase like the download status bar. Only the text Dismiss is built; the × variant is still to try.
- For 48: `startUpdate` returns early unless `fakeUpdate` is set, so the real download replaces that guard.
