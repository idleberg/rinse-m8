# 62: Export subscriptions

**What to build:** Settings gets a new **Show data** row with two buttons side by side: **Import…** and **Export…**. **Export…** opens a save dialog (default name `rinse-m8-subscriptions.json`, JSON filter) and writes the subscribed shows to that file. **Import…** is visible but disabled until #63. Cancelling the dialog does nothing.

This ticket defines the data file contract:

```json
{
	"version": 1,
	"subscriptions": [{ "slug": "dubquake-records", "title": "Dubquake Records" }]
}
```

- `version` is the **major version** of the format, an integer. Breaking changes bump it. Adding optional fields doesn't, and readers ignore fields they don't know.
- The file holds subscriptions only. Seen episode ids and other settings stay out.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Settings shows a **Show data** row with **Import…** and **Export…** in one row, after **Image cache**.
- [x] **Export…** writes a pretty-printed file matching the contract above, with `version: 1`.
- [x] **Export…** is disabled when there are no subscriptions.
- [x] Cancelling the save dialog writes nothing and shows no error. A failed write shows the error banner.
- [x] Unit test: an exported file parses back to the same subscriptions.
