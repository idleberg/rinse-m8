<script lang="ts">
	import { getCurrentWindow } from '@tauri-apps/api/window';

	type Theme = 'light' | 'dark';

	/** `undefined` follows the system appearance. */
	let theme = $state(document.documentElement.dataset.theme as Theme | undefined);

	$effect(() => {
		if (theme) {
			document.documentElement.dataset.theme = theme;
			localStorage.setItem('theme', theme);
		} else {
			delete document.documentElement.dataset.theme;
			localStorage.removeItem('theme');
		}

		// The title bar follows the window's theme, not the page's
		// ponytail: set only once the app mounts, so with an override it shows the system theme for a moment at launch; persist it in Rust settings if that shows
		getCurrentWindow()
			.setTheme(theme ?? null)
			.catch(console.error);
	});

	const options: [string, Theme | undefined][] = [
		['System', undefined],
		['Light', 'light'],
		['Dark', 'dark'],
	];
</script>

<div role="group" aria-label="Appearance">
	{#each options as [label, value] (label)}
		<button aria-pressed={theme === value} onclick={() => (theme = value)}>{label}</button>
	{/each}
</div>

<style>
	div {
		display: flex;
	}

	button + button {
		border-left: none;
	}
</style>
