# 16: Resumable downloads

**What to build:** A download writes into `<Show> - <YYYY-MM-DD>.mp3.part` and is renamed to `.mp3` only once it's complete, so a finished `.mp3` is always a whole file. When a `.part` file already exists, the download resumes from its size with a byte-range request. It continues only if the server answers `206` with a `Content-Range` starting at that offset; otherwise it discards the partial file and starts over. A finished file whose size doesn't match the total the server reported counts as failed. A failed download keeps its `.part` file, so clicking download on that episode again resumes it.

**Blocked by:** 15 (Download queue with progress)

**Status:** ready-for-agent

- [ ] Downloads stream into a `.part` file and are renamed to `.mp3` on completion
- [ ] An existing `.part` file is resumed with `Range: bytes=<size>-`
- [ ] A resume continues only on `206` with a matching `Content-Range` start; any other answer restarts from zero
- [ ] A size mismatch with the reported total fails the download and keeps the `.part` file
- [ ] Progress for a resumed download counts the bytes already on disk
- [ ] A `cargo test` check of the resume decision: `206` with a matching offset resumes, while `200`, or `206` with a different offset, restarts
- [ ] Manual check: cut the network mid-download, restore it, click download again; it continues from where it stopped and the mp3 plays to the end
