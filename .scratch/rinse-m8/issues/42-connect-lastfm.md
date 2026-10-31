# 42: Connect Last.fm in Settings

**What to build:** The app ships with one Last.fm API key and secret, read at compile time from `LASTFM_API_KEY` and `LASTFM_API_SECRET`, so neither is committed. When both are present, Settings shows a Last.fm row:

1. The user clicks **Connect**. The app opens Last.fm's approval page in the browser, and the row reads "waiting for approval…".
2. Once the user approves, the row reads "connected as NAME" and offers **Disconnect**.

If approval doesn't come within a few minutes, connecting gives up and the row offers **Connect** again. The session key doesn't expire. It's kept in its own store, apart from the settings, so the webview never sees it.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] A build without the env vars shows no Last.fm row.
- [ ] **Connect** opens the approval page and the row reads "waiting for approval…".
- [ ] After the user approves, the row reads "connected as NAME", and it still does after a restart.
- [ ] Without approval, connecting times out and the row offers **Connect** again.
- [ ] **Disconnect** deletes the session, and the row offers **Connect** again.
- [ ] `get_settings` never returns the session key.
- [ ] `release.yml` passes `LASTFM_API_KEY` and `LASTFM_API_SECRET` from the repository secrets (already defined) to the Build step, so release builds show the Last.fm row.
