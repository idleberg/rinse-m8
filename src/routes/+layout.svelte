<script lang="ts">
	import { listen } from '@tauri-apps/api/event';
	import ConfirmDialog from '#lib/components/ConfirmDialog.svelte';
	import DownloadStatus from '#lib/components/DownloadStatus.svelte';
	import Player from '#lib/components/Player.svelte';
	import UpdateBanner from '#lib/components/UpdateBanner.svelte';
	import { directory } from '#lib/directory.svelte';
	import { downloads } from '#lib/downloads.svelte';
	import type { Show } from '#lib/episodes';
	import { episodes } from '#lib/episodes.svelte';
	import { errors } from '#lib/errors.svelte';
	import { filters } from '#lib/filters.svelte';
	import { lastfm } from '#lib/lastfm.svelte';
	import { openShow } from '#lib/navigation';
	import { player } from '#lib/player.svelte';
	import { settings } from '#lib/settings.svelte';
	import { updates } from '#lib/updates.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let { children } = $props();

	const tabs = [
		['/', 'My Shows'],
		['/player', 'Player'],
		['/schedule', 'Schedule'],
		['/shows', 'Shows'],
		['/downloads', 'Downloads'],
		['/settings', 'Settings'],
	] as const;

	errors.init();
	settings.init();
	lastfm.init();
	updates.init();

	episodes.init();
	filters.init();
	directory.init();
	player.init();
	downloads.init({
		openQueue: () => goto('/downloads'),
	});

	// A click on a new-episode notification opens its show, refetched so the new episode is listed
	listen<Show>('open-show', (event) => openShow(event.payload.slug)).catch(errors.report);

	// The tray menu's Settings item, which has already shown the window
	listen('open-settings', () => goto('/settings')).catch(errors.report);
</script>

<!-- With Tauri's file drop off, a dropped file would otherwise open in the window -->
<svelte:window
	ondragover={(event) => event.dataTransfer?.types.includes('Files') && event.preventDefault()}
	ondrop={(event) => event.dataTransfer?.types.includes('Files') && event.preventDefault()}
/>

<UpdateBanner />

<nav>
	{#each tabs as [path, label] (path)}
		<button type="button" aria-current={page.url.pathname === path ? 'page' : undefined} onclick={() => page.url.pathname !== path && goto(path)}
			>{label}</button
		>
	{/each}
</nav>

<!-- Settings swap light and dark, to stand apart from the other pages -->
<main class:inverted={page.url.pathname === '/settings'}>
	{#if errors.message}
		<p role="alert">
			{errors.message}
			<button type="button" class="icon" aria-label="Dismiss" title="Dismiss" onclick={errors.clear}>
				<svg viewBox="0 0 16 16" aria-hidden="true">
					<path d="M4 4l8 8M12 4l-8 8" />
				</svg>
			</button>
		</p>
	{/if}

	{@render children()}
</main>

<div class="bars">
	<DownloadStatus />
	<Player />
</div>

<ConfirmDialog />

<style>
	/* Pinned to the top of the window while the page scrolls under it */
	nav {
		position: sticky;
		top: 0;
		z-index: 1;
		box-sizing: border-box;
		display: flex;
		/* As tall as the player bar, bottom line included */
		height: 40px;
		border-bottom: 1px solid currentColor;
		background: var(--paper);
	}

	/* Full-height cells */
	nav button {
		border: none;
		padding: 0 1rem;
		white-space: nowrap;
	}

	/* One line before each tab but the first. Ink, not currentColor, so it doesn't vanish beside the active tab. */
	nav button + button {
		border-left: 1px solid var(--ink);
	}

	/* Settings sits at the right edge */
	nav button:last-child {
		margin-left: auto;
	}

	/* Closes off the left group, since Settings' line moved away with it */
	nav button:nth-last-child(2) {
		border-right: 1px solid var(--ink);
	}

	/* Inset, since the cells touch each other and the window's top edge */
	nav button:focus-visible {
		outline-offset: -3px;
	}

	main {
		padding: 1rem;
	}

	/* Fills the window below the nav, so the swapped background doesn't stop short */
	main.inverted {
		display: flex;
		flex-direction: column;
		flex: 1;
	}

	.bars {
		position: sticky;
		bottom: 0;
		margin-top: auto;
	}

	[role='alert'] {
		display: flex;
		gap: 1rem;
		align-items: center;
		justify-content: space-between;
		/* Cancels main's padding, so the banner meets the window edges and the nav */
		margin: -1rem -1rem 1rem;
		padding: 0.5rem 1rem;
		background: var(--accent);
		color: white;
	}
</style>
