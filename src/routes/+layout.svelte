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

<!-- With Tauri's file drop off, a dropped file would otherwise open in the window. Cmd+K (Ctrl+K off macOS) focuses the page's filter input -->
<svelte:window
	ondragover={(event) => event.dataTransfer?.types.includes('Files') && event.preventDefault()}
	ondrop={(event) => event.dataTransfer?.types.includes('Files') && event.preventDefault()}
	onkeydown={(event) => {
		const modifier = navigator.userAgent.includes('Mac') ? event.metaKey : event.ctrlKey;
		const search = document.querySelector<HTMLInputElement>('main input[type="search"]');

		if (modifier && event.key.toLowerCase() === 'k' && search) {
			event.preventDefault();
			search.select();
		}
	}}
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

<!-- Imported only in dev, so release builds drop the panel and its shortcut -->
{#if import.meta.env.DEV}
	{#await import('#lib/components/DevPanel.svelte') then { default: DevPanel }}
		<DevPanel />
	{/await}
{/if}

<style>
	/* Pinned to the top of the window while the page scrolls under it */
	nav {
		position: sticky;
		top: 0;
		/* Above the window frame, so a focused tab can cover the top line. The nav draws that line itself instead. */
		z-index: 3;
		box-sizing: border-box;
		display: flex;
		gap: 1px;
		/* As tall as the player bar, lines included */
		height: 40px;
		border-block: 1px solid var(--ink);
		background: var(--paper);
	}

	/* Full-height cells. Each draws a 1px ring just outside itself, onto the nav's lines and into the gaps, so every tab is boxed on all four sides. Ink, not currentColor, so it doesn't vanish beside the active tab. */
	nav button {
		border: none;
		padding: 0 1rem;
		white-space: nowrap;
		box-shadow: 0 0 0 1px var(--ink);
	}

	/* Settings sits at the right edge */
	nav button:last-child {
		margin-left: auto;
	}

	/* The ring at the window's edge is offscreen, so the outline's outer pixel is too. The shadow restores the 2px there. */
	nav button:first-child:focus-visible {
		box-shadow: inset 2px 0 var(--accent);
	}

	nav button:last-child:focus-visible {
		box-shadow: inset -2px 0 var(--accent);
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
		/* Redefined, so hovered buttons invert to white on red */
		--ink: white;
		--paper: var(--accent);
		background: var(--paper);
		color: var(--ink);
	}
</style>
