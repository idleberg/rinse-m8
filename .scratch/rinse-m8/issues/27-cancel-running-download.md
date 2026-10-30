# 27: Cancel the running download

**What to build:** The running download in the queue view gets a "Cancel" button. Cancelling stops the transfer, deletes the partly written file, and starts the next waiting download. A cancelled download isn't a failure: it doesn't show as failed and isn't marked as downloaded.

**Blocked by:** 23 (Download queue view)

**Status:** needs-triage

- [ ] The running download has a Cancel button in the queue view
- [ ] Cancelling stops the transfer and deletes the partial file
- [ ] The next waiting download starts afterwards
- [ ] A cancelled download isn't shown as failed or marked as downloaded, and isn't restored after a restart
- [ ] Unit test: cancelling the running download clears it without setting `failed` or adding it to `downloaded`
