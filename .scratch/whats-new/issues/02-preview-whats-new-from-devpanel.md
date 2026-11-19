# 02: Preview "What's new" from the DevPanel

**What to build:** In dev builds, a DevPanel control opens the "What's new" dialog with the current notes, ignoring the seen version, so the notes' content and styling can be checked without editing localStorage. It doesn't change the stored seen version.

**Blocked by:** 01

**Status:** ready-for-agent

- [x] The DevPanel has a control that opens the "What's new" dialog with the bundled notes
- [x] Opening the preview leaves the stored seen version unchanged
- [x] With empty notes, the control is disabled or the dialog says there are no notes
- [x] Release builds don't include it (the DevPanel is already dev-only)

## Comments
