# 01: Image style setting: Original or Dithered

**What to build:** A new **Image style** setting decides how show and episode artwork looks in the Player cover and the show view. This ticket adds two choices, Original (the default) and Dithered. Dithered applies Atkinson dithering to the artwork at the cached size, giving pure black and white with no grays. Changing the setting updates the images on screen straight away, without downloading anything again.

The image cache stores each downloaded image once, as the shrunk original. The existing cache already holds exactly that, so it stays valid and nothing needs clearing or downloading again. The dithered copy is made from the cached original the first time it's needed, saved as PNG next to the original under its own name, and reused after that. PNG is used because JPEG would smear the dot pattern. The style is part of the image URL (for example `?style=dithered`), added when the image is shown. That way each style has its own URL, so the webview never mixes up copies from different styles, and the Rust side doesn't need to know the setting. Clearing the image cache in Settings, and the cache size shown there, cover the styled copies as well.

Write the dithering by hand on the `image` crate the app already uses, with no new dependency. The `dither` crate was rejected because it pulls in `image` 0.23 and `clap` 3 beta. Bytes that don't decode as an image are served unchanged in every style.

**Prototype verdict:** a webview prototype compared six variants on the real pages: plain Atkinson at 560px, contrast-stretched Atkinson, Atkinson in the app's ink/paper colours, chunky 280px Atkinson, Floyd–Steinberg, and the original artwork. Plain Atkinson at 560px in black and white looked best. Jan kept the prototype on a throwaway branch: _branch name: TODO, fill in_. This ticket removes the prototype from main: the dither prototype module, its switcher, the hooks on the two images, and the CORS header on the `image` scheme.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Settings has an Image style choice (Original, Dithered) that is saved and survives a relaunch; Original is the default
- [ ] With Dithered, the Player cover and the show view image are Atkinson-dithered to black and white (error spread 1/8 to the six standard neighbours)
- [ ] Changing the style updates the images on screen without a reload, and switching back and forth downloads nothing
- [x] The cache keeps one original per image, plus at most one dithered PNG made from it; images cached before this change still work as originals
- [x] Clearing the image cache removes the styled copies too, and the cache size counts them
- [x] Bytes that aren't an image come back unchanged in either style
- [x] No new crate dependency
- [x] All prototype code is gone from main, including the CORS header
- [x] **Image style** is defined in `GLOSSARY.md` next to **Image cache**
- [x] A test checks that dithering a mid-gray image gives only black and white pixels, both present, and that non-image bytes pass through unchanged

## Comments

Implemented together with 02. The setting is `imageStyle` (`original`, `dithered`, `grayscale`). The Rust side reads `?style=` in the `image` scheme, and `styled_image` in `rinse.rs` saves each styled copy as `{name}.{style}` next to the original. The frontend adds the query through `settings.styled(src)`.

Not checked in the running app: whether the dithered Player cover and show view image look right, and whether switching updates them on screen without a reload.
