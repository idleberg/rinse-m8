# 49: Release workflow publishes updates

**What to build:** Tagged releases also build signed update bundles: the macOS app archive, the Windows NSIS installer and the Linux AppImage. The release workflow writes and uploads a `latest.json` manifest. Its URLs match the dash-renamed release files, and it lists the universal macOS archive for both Apple architectures. The build gets the signing secrets. deb and rpm users keep updating manually.

**Blocked by:** 48 (Real update check, install and relaunch)

**Status:** ready-for-agent

- [ ] The signing private key and password come from repo secrets
- [ ] macOS builds the app archive alongside the dmg, and the archives and signatures are collected
- [ ] `latest.json` lists all four platform keys with signatures and working URLs
- [ ] `latest.json` is uploaded with the release, next to the checksums
- [ ] Manual check (human: secrets + tag): tag a release, then confirm that an installed previous version updates from GitHub
