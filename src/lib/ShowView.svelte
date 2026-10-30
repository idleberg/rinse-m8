<script lang="ts">
	import EpisodeFilters from './EpisodeFilters.svelte';
	import EpisodeTable from './EpisodeTable.svelte';
	import SubscribeButton from './SubscribeButton.svelte';
	import { type DownloadQueue, type Episode, type Show, showOf } from './episodes';

	let {
		show,
		refreshing,
		episodes,
		subscribed,
		downloads,
		subscribing,
		ondownload,
		onopenshow,
		ontogglesubscription,
		onback,
	}: {
		show: Show;
		refreshing: boolean;
		/** All cached episodes; the view keeps the show's own. */
		episodes: Episode[];
		/** Show slugs. */
		subscribed: string[];
		downloads: DownloadQueue;
		/** Show slugs. */
		subscribing: string[];
		ondownload: (episode: Episode) => void;
		onopenshow: (episode: Episode) => void;
		ontogglesubscription: (show: Show) => void;
		onback: () => void;
	} = $props();

	let mp3Only = $state(true);
	let hideRebroadcasts = $state(false);

	const visibleEpisodes = $derived(
		episodes.filter(
			(episode) =>
				episode.showSlug === show.slug && (!mp3Only || episode.mp3) && (!hideRebroadcasts || !episode.rebroadcast),
		),
	);
</script>

<header>
	<button onclick={onback}>Back</button>
	<h1>{show.title}</h1>
	<SubscribeButton
		subscribed={subscribed.includes(show.slug)}
		disabled={subscribing.includes(show.slug)}
		onclick={() => ontogglesubscription(show)}
	/>
	{#if refreshing}
		<span role="status">Refreshing…</span>
	{/if}
</header>

<EpisodeFilters bind:mp3Only bind:hideRebroadcasts />

<EpisodeTable
	episodes={visibleEpisodes}
	{subscribed}
	{downloads}
	{subscribing}
	{ondownload}
	{onopenshow}
	ontogglesubscription={(episode) => ontogglesubscription(showOf(episode))}
/>

<style>
	header {
		display: flex;
		gap: 1rem;
		align-items: center;
		margin: 0 0 1rem;
	}

	h1 {
		margin: 0;
		font-size: 1.5rem;
		text-transform: uppercase;
	}
</style>
