<script lang="ts">
	import EpisodeTable from '#lib/components/EpisodeTable.svelte';
	import SubscribeButton from '#lib/components/SubscribeButton.svelte';
	import type { Episode, Show } from '#lib/episodes';
	import { openShow } from '#lib/navigation';

	let {
		show,
		episodes,
	}: {
		show: Show;
		/** The show's filtered episodes, at least one. */
		episodes: Episode[];
	} = $props();

	const limit = 5;
	let expanded = $state(false);
</script>

<section>
	<header>
		<h2><button type="button" class="plain link" onclick={() => openShow(show.slug)}>{show.title}</button></h2>
		<SubscribeButton {show} />
	</header>
	<EpisodeTable {episodes} limit={expanded ? undefined : limit} markable />
	{#if episodes.length > limit}
		<button type="button" aria-expanded={expanded} onclick={() => {
			expanded = !expanded;
		}}>
			{expanded ? 'Show less' : `Show all (${episodes.length})`}
		</button>
	{/if}
</section>

<style>
	section {
		margin: 0 0 2rem;
	}

	header {
		display: flex;
		gap: 1rem;
		align-items: center;
		margin: 0 0 0.5rem;
	}

	h2 {
		margin: 0;
		font-size: 1.25rem;
		text-transform: uppercase;
	}

	.link {
		font-weight: inherit;
		text-align: left;
	}

	section > button {
		margin-top: 0.5rem;
	}
</style>
