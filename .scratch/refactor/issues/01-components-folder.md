# 01: Components folder and `$lib` imports

**What to build:** Every Svelte component moves into a components folder under `lib`, and all imports switch from relative paths to the `$lib` alias. A mechanical prefactor so the later tickets land on the final paths. The app looks and behaves exactly as before.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] All `.svelte` components live in `lib/components/`; TS modules stay flat in `lib/`
- [ ] No relative `../lib/` or `./` cross-folder imports remain; everything imports via `$lib/…`
- [ ] `bun test` and `svelte-check` pass
- [ ] The app runs and every tab works as before
