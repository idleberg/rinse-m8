# 01: Dependency refresh and switch to bun

**What to build:** A refreshed project base. Every JS and Rust dependency is at its latest version. bun is the only package manager. The app is called "Rinse M8". The plugins later tickets need are installed, and the template leftovers are gone. The app still launches.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The Deno and pnpm lockfiles are removed, and bun's lockfile is the only one
- [ ] Svelte, SvelteKit, Vite, svelte-check, TypeScript and the Tauri JS packages are at latest, with any config breakage fixed
- [ ] `cargo update` has run, and reqwest is at latest with JSON and streaming support
- [ ] The deprecated shell plugin is replaced by the opener plugin, on both the JS and Rust sides
- [ ] The notification, store and dialog plugins, tokio (timers) and a futures stream helper are added
- [ ] The Tauri dev and build hooks use bun, and the product name and window title are "Rinse M8"
- [ ] The `greet` command, the loader stub and the template README content are removed
- [ ] `bun run tauri dev` opens an empty window and `bun run check` passes
