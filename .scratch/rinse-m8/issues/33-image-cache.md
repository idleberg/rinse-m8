# 33: Image cache

**What to build:** The show view's image is kept on disk once it has been loaded, so opening the show again never downloads it again, across restarts. Rinse never reuses an image filename for a new image, so a cached image never goes stale and is kept indefinitely. An image that fails to download leaves nothing behind and is tried again on the next visit.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Opening a show view a second time, even after a restart, shows its image without a network request
- [x] A failed or interrupted download leaves no partial image in the cache
- [x] An image name can't reach outside the cache folder
