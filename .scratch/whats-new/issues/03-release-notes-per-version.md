# 03: Release notes per version

**What to build:** Release notes belong to the version they ship with: each version has its own Markdown notes file, converted to HTML at build time as before. At the moment there is a single unversioned notes file, so any version bump shows it again. The 0.23.2 patch showed the 0.23.0 notes a second time. After an update, the dialog shows the newest version with notes that is newer than the seen version and no newer than the current one. When no version in that range has notes (a patch without its own notes, say), nothing shows. The existing notes move to the version that shipped automatic downloads. An update from a version that recorded no seen version counts as coming from older than every version. A fresh install stays quiet, and the seen version is still recorded on every launch.

Versions compare by number, so 0.10.0 is newer than 0.9.0. There are no prerelease tags.

The DevPanel preview opens the newest bundled notes, leaves the seen version unchanged, and is disabled when no notes are bundled.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] Each version's notes live in their own Markdown file, named after the version, and the current notes move under the version that shipped them
- [x] Choosing the notes is a pure function with a test covering: fresh install → nothing; patch update with no notes for the new version → nothing; notes in range → the newest is picked; notes newer than the current version are ignored; numeric compare (0.10.0 > 0.9.0); an unknown old version → notes up to the current one
- [x] Updating to a version with no notes of its own shows nothing
- [ ] The DevPanel preview shows the newest bundled notes and is disabled when none are bundled
- [x] Type checks, lint and tests pass

## Comments
