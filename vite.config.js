import process from 'node:process';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig(async () => ({
	plugins: [
		// Tauri doesn't have a Node.js server to do proper SSR
		// so adapter-static serves an SPA fallback, which Tauri falls back to for every route
		// See: https://v2.tauri.app/start/frontend/sveltekit/ for more info

		// Runes everywhere: a component without runes compiles in legacy mode, where every binding write to an imported
		// rune module invalidates the whole import, so bind:paused re-plays the audio before its pause event lands
		sveltekit({ adapter: adapter({ fallback: 'index.html' }), compilerOptions: { runes: true } }),
	],

	// Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
	//
	// 1. prevent vite from obscuring rust errors
	clearScreen: false,

	// 2. tauri expects a fixed port, fail if that port is not available
	server: {
		port: 1420,
		strictPort: true,
		host: host || false,
		hmr: host
			? {
					protocol: 'ws',
					host,
					port: 1421,
				}
			: undefined,
		watch: {
			// 3. tell vite to ignore watching `src-tauri`
			ignored: ['**/src-tauri/**'],
		},
	},
}));
