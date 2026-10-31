# 45: Split the downloads view into Active and Previous Downloads

**What to build:** The downloads view gets two headed sections. "Active Downloads" is today's queue, unchanged, still saying "The download queue is empty" when there's nothing in it. "Previous Downloads" lists every episode recorded as downloaded, newest first, with the same Date and Show (plus subtitle) columns as the queue. File paths stay untracked: the rows come from the downloaded ids looked up in the episode cache, and ids missing from the cache are skipped. Marked episodes count as downloaded, so they're listed too. When nothing has been downloaded yet, the Previous Downloads section reads "No previous downloads", muted like the empty queue message.

**Blocked by:** None (can start immediately)

**Status:** ready-for-human

- [x] The downloads view shows an "Active Downloads" heading above the queue, which still reads "The download queue is empty" when empty
- [x] A "Previous Downloads" heading and table list every downloaded or marked episode found in the episode cache, newest first
- [x] Downloaded ids missing from the episode cache are left out instead of failing
- [x] With no downloaded episodes, the Previous Downloads section shows a muted "No previous downloads"
- [x] A download that finishes while the view is open appears in Previous Downloads without leaving the view
- [x] Progress updates of the running download don't refetch the list
- [ ] Manual check: open the downloads view with an empty queue and some past downloads, see both sections, then finish a download and see it move from Active to Previous
