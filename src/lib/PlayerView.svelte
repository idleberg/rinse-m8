<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import PlayerControls from './PlayerControls.svelte';

	let {
		controls,
	}: {
		/** The player's own, so this tab and the bottom bar show and change the same playback. */
		controls: ComponentProps<typeof PlayerControls>;
	} = $props();

	/** Images that failed to load, so the cover falls back past them. */
	let failed = $state<string[]>([]);

	const playable = $derived(controls.episode?.mp3 ? controls.episode : null);
	const cover = $derived([playable?.image, playable?.showImage].find((src) => src && !failed.includes(src)));
</script>

<section>
	<div class="cover">
		{#if cover}
			<!-- biome-ignore lint/a11y/noNoninteractiveElementInteractions: a load error, not an interaction -->
			<img src={cover} alt="" onerror={() => failed.push(cover)} />
		{:else if playable}
			<p>No artwork for this show</p>
		{/if}
	</div>
	{#if playable}
		<div class="controls">
			<PlayerControls {...controls} />
		</div>
	{:else}
		<p class="empty">Nothing playing</p>
	{/if}
</section>

<style>
	section {
		display: flex;
		gap: 1rem;
		align-items: center;
	}

	.cover {
		position: relative;
		display: grid;
		place-items: center;
		flex: none;
		width: min(20rem, 50%);
		aspect-ratio: 1;
		background: black;
		color: white;
		text-transform: uppercase;
		text-align: center;
	}

	/* Laid over the square, so its size can't stretch the grid */
	img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.cover p {
		margin: 0;
		padding: 1rem;
	}

	/* "Nothing playing" takes the controls' place, so it stretches like them */
	.controls,
	.empty {
		flex: 1;
	}

	.empty {
		margin: 0;
		text-transform: uppercase;
		color: var(--muted);
	}
</style>
