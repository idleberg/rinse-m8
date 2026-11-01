# 50: Shrink cached images

**What to build:** Every image that lands in the image cache is shrunk to the largest size the app draws, so the cache stays small. That's the Player tab's cover: at most 20rem (280 CSS px), cropped to a square. An image is scaled down, keeping its aspect ratio, until its shorter side is at most 560 px (280 px at 2× Retina). It's never enlarged. Shrinking happens once, after the fetch and before the image is written to disk, and runs off the async runtime. An image that can't be decoded is cached as it came, so nothing that loads today breaks. Images cached before this change are dropped at launch, so the cache holds only shrunk images and the size shown in Settings is accurate. The cache folder's name includes the size limit, so if the limit changes later the same cleanup runs again.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] A newly cached image has a shorter side of at most 560 px, in its original format and aspect ratio
- [x] An image already within the limit is cached unchanged
- [x] Bytes that aren't a decodable JPEG, PNG or WebP are cached as they came
- [x] At launch, the image cache's old unshrunk folder is deleted; a missing folder isn't an error
- [x] Clearing the image cache in Settings and the cache size it shows still work
- [x] Unit test: a 2000×1000 image shrinks to 1120×560, a 300×200 image comes back untouched, and non-image bytes come back unchanged
- [ ] Manual check: open a few shows, then check that no file in the image cache folder has a shorter side above 560 px

## Comments

- `rinse::shrink_image` decodes with the `image` crate (JPEG, PNG and WebP codecs only), resizes with Lanczos3 and re-encodes in the source format. Encoding failures fall back to the original bytes.
- WebP is re-encoded lossless, since `image` has no lossy WebP encoder. A shrunk WebP can come out larger than the lossy original, but Rinse serves JPEGs.
- The cache folder is now `images-560`. At launch, `rinse::remove_stale_image_caches` deletes every sibling folder whose name starts with `images` and isn't the current one.
