<script lang="ts">
	import EpisodeTable from './EpisodeTable.svelte';
	import { type DownloadQueue, type Episode, type Show, showOf } from './episodes';
	import SubscribeButton from './SubscribeButton.svelte';

	let {
		show,
		episodes,
		subscribed,
		downloads,
		subscribing,
		playing,
		onplay,
		onpause,
		ondownload,
		onmark,
		onopenshow,
		ontogglesubscription,
	}: {
		show: Show;
		/** The show's filtered episodes, at least one. */
		episodes: Episode[];
		/** Show slugs. */
		subscribed: string[];
		downloads: DownloadQueue;
		/** Show slugs. */
		subscribing: string[];
		playing: string | null;
		onplay: (episode: Episode) => void;
		onpause: () => void;
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
		<h2><button type="button" class="link" onclick={() => onopenshow(show)}>{show.title}</button></h2>
		<SubscribeButton
			subscribed={subscribed.includes(show.slug)}
			disabled={subscribing.includes(show.slug)}
			onclick={() => ontogglesubscription(show)}
		/>
	</header>
	<EpisodeTable
		{episodes}
		limit={expanded ? undefined : limit}
		{subscribed}
		{downloads}
		{subscribing}
		{playing}
		{onplay}
		{onpause}
		{ondownload}
		{onmark}
		onopenshow={(episode) => onopenshow(showOf(episode))}
	/>
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
		border: none;
		padding: 0;
		font-weight: inherit;
		text-align: left;
	}

	section > button {
		margin-top: 0.5rem;
	}
</style>
