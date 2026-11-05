# 02: Black & white image style

**What to build:** A third **Image style** choice, Black & white, which shows artwork in grayscale (shades of gray, not dithered). Like Dithered, the copy is made from the cached original the first time it's needed and saved next to it under its own name. It keeps the original image's format, because grayscale has no dot pattern for JPEG to blur. Switching between all three styles updates the images on screen and never downloads anything.

**Blocked by:** 01 (Image style setting: Original or Dithered)

**Status:** ready-for-agent

- [ ] Settings offers Black & white as a third Image style, saved like the others
- [ ] With Black & white, the Player cover and the show view image are grayscale
- [ ] The grayscale copy is cached once per image, made from the original, in the original's format
- [ ] Switching between all three styles works without downloading anything, and clearing the cache removes the grayscale copies
- [ ] Bytes that aren't an image come back unchanged
- [ ] A test checks that a coloured image becomes grayscale (equal channels) and keeps its format
