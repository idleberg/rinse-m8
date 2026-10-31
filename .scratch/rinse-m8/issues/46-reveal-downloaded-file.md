# 46: Show a downloaded episode's file in its folder

**What to build:** Each row in Previous Downloads gets an icon button with a magnifier, labelled "Show in folder", that reveals the episode's mp3 in Finder or Explorer. The app doesn't track paths: it assumes the file sits in the current download folder under the name downloads are saved with (`<Show> - <YYYY-MM-DD>.mp3`). The button is left out when no file is there (moved, deleted, or only marked as downloaded) or when no download folder is set. The check runs whenever the list is fetched, so reopening the view picks up moved or deleted files.

**Blocked by:** 45 (Split the downloads view into Active and Previous Downloads)

**Status:** ready-for-human

- [x] A Previous Downloads row whose file exists in the download folder shows a magnifier button labelled "Show in folder"
- [x] Clicking it reveals the file in the system file manager
- [x] A row whose file is missing, or any row while no download folder is set, has no button
- [x] A failed reveal reports the error
- [ ] Manual check: reveal a downloaded file, then move it out of the folder, reopen the downloads view and see its button gone
