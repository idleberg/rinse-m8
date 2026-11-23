# 03: Custom stylesheet

Status: ready-for-agent

**What to build:** A user can put a `custom.css` in the app's config folder. At launch, the app loads it after its own styles, on top of whichever theme is picked. It can do anything a built-in theme can: change the colour tokens, and restyle, re-lay-out and realign any documented theme part. A missing file changes nothing. A file that can't be read is reported through the usual error banner, and the app keeps working. Settings has a button that opens the config folder and points to the list of theme parts.

**Blocked by:** 01 (Theme parts).

- [x] A Rust command returns the text of `custom.css` from the app config directory, or nothing when the file doesn't exist. Any other read failure is an error.
- [x] At startup, the frontend adds the returned text as a `<style>` element after the app's styles.
- [x] Settings has an "Open folder" button that reveals the config directory, using the same opener-plugin reveal as "Show in folder", with a pointer to the theme parts list.
- [ ] A `custom.css` that centres the tabs, restyles the player bar and changes the checkbox glyphs takes effect in both themes and all three appearances, including the Settings `.inverted` area.
- [ ] A `custom.css` that sets `--accent` visibly overrides the accent everywhere.
- [x] Bun tests with `invoke` mocked: returned text ends up in a `<style>` element after the existing styles, nothing is added without a file, and a rejected command reaches `errors`.
- [x] `pnpm check` and `bun test` pass.
