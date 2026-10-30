# 34: Clear the image cache from Settings

**What to build:** Settings shows how much disk space the image cache takes up, with a button that clears it. Once cleared, the size reads zero, and each image downloads again the next time its show view opens. Clearing while an image is downloading is harmless: that image fails once and loads on the next visit.

**Blocked by:** 30 (Settings view), 33 (Image cache)

**Status:** done

- [x] Settings shows the image cache's size on disk, or that it's empty
- [x] A button clears the image cache, after which the size reads zero
- [x] A cleared image loads again the next time its show view opens
- [x] A failed clear keeps the old size showing and reports the error
