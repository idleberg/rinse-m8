<script lang="ts">
	import EpisodeTable from './EpisodeTable.svelte';
	import { type DownloadQueue, type Episode, type Show, showOf } from './episodes';

	let {
		show,
		episodes,
		subscribed,
		downloads,
		subscribing,
		ondownload,
		onopenshow,
		ontogglesubscription,
	}: {
		show: Show;
		/** The show's filtered episodes, newest first. */
		episodes: Episode[];
		/** Show slugs. */
		subscribed: string[];
		downloads: DownloadQueue;
		/** Show slugs. */
		subscribing: string[];
		ondownload: (episode: Episode) => void;
		onopenshow: (show: Show) => void;
		ontogglesubscription: (show: Show) => void;
	} = $props();

	const limit = 5;
	let expanded = $state(false);
</script>

<section>
	<h2><button class="link" onclick={() => onopenshow(show)}>{show.title}</button></h2>
	{#if episodes.length}
		<EpisodeTable
			episodes={expanded ? episodes : episodes.slice(0, limit)}
			{subscribed}
			{downloads}
			{subscribing}
			{ondownload}
			onopenshow={(episode) => onopenshow(showOf(episode))}
			ontogglesubscription={(episode) => ontogglesubscription(showOf(episode))}
		/>
		{#if episodes.length > limit}
			<button aria-expanded={expanded} onclick={() => (expanded = !expanded)}>
				{expanded ? 'Show less' : `Show all (${episodes.length})`}
			</button>
		{/if}
	{:else}
		<p>No episodes match the filters</p>
	{/if}
</section>

<style>
	section {
		margin: 0 0 2rem;
	}

	h2 {
		margin: 0 0 0.5rem;
		font-size: 1.25rem;
		text-transform: uppercase;
	}

	.link {
		border: none;
		padding: 0;
		font-weight: inherit;
		text-align: left;
	}

	section > button {
		margin-top: 0.5rem;
	}

	p {
		text-transform: uppercase;
		color: var(--muted);
	}
</style>
