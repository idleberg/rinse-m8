<script lang="ts" module>
	import { getCurrentWindow } from '@tauri-apps/api/window';

	type Theme = 'light' | 'dark';

	// The toggle only mounts on the Settings page, so apply a saved override to the title bar at startup
	getCurrentWindow()
		.setTheme((document.documentElement.dataset.theme as Theme | undefined) ?? null)
		.catch(console.error);
</script>

<script lang="ts">
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
		// ponytail: set only once the app loads, so with an override it shows the system theme for a moment at launch; persist it in Rust settings if that shows
		getCurrentWindow()
			.setTheme(theme ?? null)
			.catch(console.error);
	});

	const options: [string, Theme | undefined][] = [
    ['Light', 'light'],
		['System', undefined],
		['Dark', 'dark'],
	];
</script>

<fieldset aria-label="Appearance">
	{#each options as [label, value] (label)}
		<button type="button" aria-pressed={theme === value} onclick={() => {
			theme = value;
		}}>{label}</button>
	{/each}
</fieldset>

<style>
	fieldset {
		display: flex;
		margin: 0;
		border: none;
		padding: 0;
	}

	button + button {
		border-left: none;
	}
</style>
