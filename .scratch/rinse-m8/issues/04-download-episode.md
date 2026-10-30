# 04: Download an episode

**What to build:** A download button on every row with an available mp3. The first time, it asks for a download folder and remembers it. Files are streamed to disk as `<Show> - <YYYY-MM-DD>.mp3`.

**Blocked by:** 02 (Schedule episodes in a table)

**Status:** ready-for-agent

- [x] The download action shows only on available rows
- [x] If no download folder is set, the dialog plugin's folder picker opens, and the choice is saved in settings
- [x] A `download` command streams the mp3 to disk in chunks, never holding the whole ~280 MB file in memory
- [x] The file is named `<Show> - <YYYY-MM-DD>.mp3`, using the London broadcast date, with filesystem-unsafe characters stripped from the show name
- [x] Errors (network or disk) reach the UI rather than failing silently
- [ ] Manual check: download one episode; the file plays in a system player

## Comments

- Two episodes of one show on the same London date get the same file name, and the second overwrites the first.
- The frontend writes `downloadFolder` straight into `settings.json`. Issue 06's settings struct needs camelCase serde keys to match.
- Issue 08 can reuse `rinse::download(&episode, &folder)`, but the folder lookup sits inside the `download` command in `lib.rs` and should move into a shared helper.
