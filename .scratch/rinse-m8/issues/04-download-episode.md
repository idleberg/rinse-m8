# 04: Download an episode

**What to build:** A download button on every row with an available mp3. The first time, it asks for a download folder and remembers it. Files are streamed to disk as `<Show> - <YYYY-MM-DD>.mp3`.

**Blocked by:** 02 (Schedule episodes in a table)

**Status:** ready-for-agent

- [ ] The download action shows only on available rows
- [ ] If no download folder is set, the dialog plugin's folder picker opens, and the choice is saved in settings
- [ ] A `download` command streams the mp3 to disk in chunks, never holding the whole ~280 MB file in memory
- [ ] The file is named `<Show> - <YYYY-MM-DD>.mp3`, using the London broadcast date, with filesystem-unsafe characters stripped from the show name
- [ ] Errors (network or disk) reach the UI rather than failing silently
- [ ] Manual check: download one episode; the file plays in a system player
