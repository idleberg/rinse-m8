# 04: A default download folder

**What to build:** When no download folder is set, downloads go to a folder called `Rinse M8` inside the OS music folder. Tauri's `app.path().audio_dir()` finds it: `~/Music` on macOS, the Music library on Windows and `XDG_MUSIC_DIR` on Linux. No new dependency is needed.

The default is never stored. `download_folder` stays optional, and the backend falls back to the default wherever it reads the setting, so a later change to the default still reaches everyone who never chose a folder. The folder is created on the first download, not at launch.

Settings shows the folder in use. When that's the default, Settings says so. Choosing a folder stores it, as it does today, and the user can return to the default from Settings.

`audio_dir()` can come back empty, for example on Linux without XDG user dirs. Then there's no default, and everything works as it does today: a download asks for a folder, and notifications offer Download only once one is set.

With a default in place, notifications offer Download even to users who never chose a folder ([lib.rs:1102](../../../src-tauri/src/lib.rs#L1102) currently requires one). The folder prompts in 02 and 03 only appear when there's no default.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] With no folder set, a download lands in `<music folder>/Rinse M8`, which is created if missing
- [x] The default is never written to the settings file
- [x] Settings shows the folder in use and marks the default as such
- [x] A chosen folder wins over the default, and Settings can switch back to the default
- [x] With no folder set but a default available, notifications offer Download and downloading doesn't ask for a folder
- [x] With no music folder and no folder set, downloading asks for a folder, as before
- [x] Tests cover resolving the folder with a stored folder, with only the default, and with neither
