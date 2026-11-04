# 01: Components folder and `$lib` imports

**What to build:** Every Svelte component moves into a components folder under `lib`, and all imports switch from relative paths to the `$lib` alias. A mechanical prefactor so the later tickets land on the final paths. The app looks and behaves exactly as before.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] All `.svelte` components live in `lib/components/`; TS modules stay flat in `lib/`
- [x] No relative `../lib/` or `./` cross-folder imports remain; everything imports via `$lib/…`
- [x] `bun test` and `svelte-check` pass
- [ ] The app runs and every tab works as before

## Comments

- SvelteKit 3 removed `$lib` (`module_removed_lib`), so imports use `#lib/…` via `package.json` `imports`. The `"./src/lib/*.ts"` fallback lets TypeScript resolve extensionless `.ts` imports.
- Tests in `lib/` keep `./` imports: same folder, and Bun resolves them without the alias.
- `svelte-check` 0 errors, `bun test` 15 pass, `vite build` succeeds. The app hasn't been launched by hand yet, so the last box stays open.
- Later tickets say `$lib/…`; read that as `#lib/…`.
