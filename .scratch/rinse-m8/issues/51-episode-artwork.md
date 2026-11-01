# 51: Episode artwork in the episode cache

**What to build:** Every episode carries two image URLs, both served through the `image` scheme so they go through the image cache:

- its own artwork, from the episode's `featuredImage`
- its show's artwork, from `parentShow`'s `featuredImage`

Either one is missing when Rinse sends none (Rinse often sends `[]`). Episode caches saved before this change still load, with both images missing until the poller refreshes them. The show view's image keeps working and is built the same way.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Episodes from the schedule and from a show's episodes include the episode image and the show image when Rinse provides them
- [x] An episode without artwork has no image, rather than a broken URL
- [x] An episode cache from before this change loads without errors
- [x] The frontend's episode type has both fields
- [x] Unit test: mapping the schedule fixture yields the expected episode image and show image URLs
