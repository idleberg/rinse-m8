# 01: Show "What's new" once after an update

**What to build:** After the app updates to a new version, a modal dialog shows that release's notes once. The notes come from one hand-written Markdown file bundled with the app and converted to HTML at build time, so the converter stays out of the app bundle. If the file is empty or holds only whitespace, there is no news and nothing shows. On a fresh install nothing shows either: the running version is recorded silently. Each version shows its notes at most once. The last-seen version is kept in the webview's localStorage, not in the settings store.

The dialog is its own component, separate from the confirm dialog, but matches its look and behaviour: a native modal, a header with "What's new in <version>" and a `[×]` close button, the notes as the body (scrolling when long), and a single OK button that gets focus when the dialog opens.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] A Markdown notes file is bundled with the app and imported as HTML converted at build time
- [x] The decision whether to show is a pure function with a test covering: no seen version → hidden; seen version equals the current one → hidden; empty or whitespace-only notes → hidden; a different seen version with notes → shown
- [ ] After an update with notes, the dialog shows once, and Esc, `[×]` and OK all close it
- [x] Relaunching the same version doesn't show it again
- [x] A fresh install shows nothing and records the current version
- [x] Empty notes show nothing
- [x] Type checks and lint pass

## Comments
