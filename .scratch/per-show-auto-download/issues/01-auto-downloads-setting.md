# 01: Auto-downloads setting replaces the toggle

**What to build:** In Settings, the auto-download checkbox becomes a select with three values: Off, Selected shows and All subscribed shows. All subscribed shows works exactly like the checkbox did when it was ticked. For now, Selected shows downloads nothing, because per-show auto-download only arrives in 02. A notification's Download button shows for every new episode unless the mode is All subscribed shows.

Existing installs keep their behaviour. A ticked checkbox becomes All subscribed shows, and an unticked one becomes Off. A ticked checkbox with no download folder downloaded nothing, so it becomes Off as well. Otherwise the default folder from 04 would start downloads the user never saw happen before. Fresh installs default to Off. The new value is stored under a new settings key, and the old boolean is read only when that key is missing. A stored value of the wrong type would break loading all settings, subscriptions included. The new key also keeps a downgrade working, since an older build ignores it and still reads its boolean.

The glossary records the new meanings. Subscribing puts a show's new episodes on the Dashboard and notifies about them. Auto-download is separate: it puts new episodes in the download queue.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] Settings shows a select with Off, Selected shows and All subscribed shows in place of the checkbox
- [x] A stored `true` from an older version loads as All subscribed shows; a stored `false`, or none at all, loads as Off
- [x] A stored `true` with no download folder loads as Off
- [x] Once the new value is stored, it wins over any old boolean
- [x] With All subscribed shows and a download folder, new episodes of subscribed shows go into the download queue, as before
- [x] With Off or Selected shows, nothing is downloaded automatically and notifications offer Download
- [x] Tests cover the migration in both directions and the select saving its value
- [x] GLOSSARY.md defines subscribe and auto-download with their new meanings
