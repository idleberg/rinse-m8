<script lang="ts">
	import EpisodeTable from './EpisodeTable.svelte';
	import SubscribeButton from './SubscribeButton.svelte';
	import { type DownloadQueue, type Episode, type Show, showOf } from './episodes';

	let {
		show,
		episodes,
		subscribed,
		downloads,
		subscribing,
		ondownload,
		onmark,
		onopenshow,
		ontogglesubscription,
	}: {
		show: Show;
		/** The show's filtered episodes. */
		episodes: Episode[];
		/** Show slugs. */
		subscribed: string[];
		downloads: DownloadQueue;
		/** Show slugs. */
		subscribing: string[];
		ondownload: (episode: Episode) => void;
		onmark: (episode: Episode) => void;
		onopenshow: (show: Show) => void;
		ontogglesubscription: (show: Show) => void;
	} = $props();

	const limit = 5;
	let expanded = $state(false);
</script>

<section>
	<header>
		<h2><button class="link" onclick={() => onopenshow(show)}>{show.title}</button></h2>
		<SubscribeButton
			subscribed={subscribed.includes(show.slug)}
			disabled={subscribing.includes(show.slug)}
			onclick={() => ontogglesubscription(show)}
		/>
	</header>
	{#if episodes.length}
		<EpisodeTable
			{episodes}
			limit={expanded ? undefined : limit}
			{subscribed}
			{downloads}
			{subscribing}
			{ondownload}
			{onmark}
			onopenshow={(episode) => onopenshow(showOf(episode))}
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
