# 49: Release workflow publishes updates

**What to build:** Tagged releases also build signed update bundles: the macOS app archive, the Windows NSIS installer and the Linux AppImage. The release workflow writes and uploads a `latest.json` manifest. Its URLs match the dash-renamed release files, and it lists the universal macOS archive for both Apple architectures. The build gets the signing secrets. deb and rpm users keep updating manually.

**Blocked by:** 48 (Real update check, install and relaunch)

**Status:** ready-for-human

- [x] The signing private key and password come from repo secrets
- [x] macOS builds the app archive alongside the dmg, and the archives and signatures are collected
- [x] `latest.json` lists all four platform keys with signatures and working URLs
- [x] `latest.json` is uploaded with the release, next to the checksums
- [ ] Manual check (human: secrets + tag): tag a release, then confirm that an installed previous version updates from GitHub

## Comments

- All changes are in `.github/workflows/release.yml`. The repo needs the `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` secrets, and the matching public key has to be in `pubkey` in `tauri.conf.json` (still empty from 48).
- `createUpdaterArtifacts` is passed with `--config` in the Build step, not set in `tauri.conf.json`, so local builds work without the signing key. The Build step runs in bash so the JSON quoting works the same on Windows.
- The manifest step was dry-run locally against fake files. Its output was correct, and a missing `.sig` fails the step. It hasn't run in CI yet.
- `SHA256SUMS` now also covers the `.sig` files and the macOS `.app.tar.gz`.
