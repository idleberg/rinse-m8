<script lang="ts">
	import EpisodeFilters from './EpisodeFilters.svelte';
	import EpisodeTable from './EpisodeTable.svelte';
	import SubscribeButton from './SubscribeButton.svelte';
	import { type DownloadQueue, type Episode, type Show, type ShowDetails, paragraphs, showOf } from './episodes';

	let {
		show,
		details,
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
		/** Null until the show's fetch returns. */
		details: ShowDetails | null;
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

	const description = $derived(details?.description ? paragraphs(details.description) : []);
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

{#if details?.image || description.length}
	<section>
		{#if details?.image}
			<img src={details.image} alt="" />
		{/if}
		<div>
			{#each description as paragraph}
				<p>{paragraph}</p>
			{/each}
		</div>
	</section>
{/if}

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

	section {
		display: flex;
		gap: 1rem;
		align-items: flex-start;
		margin: 0 0 1rem;
	}

	img {
		width: 12rem;
		height: auto;
	}

	section p {
		margin: 0 0 0.5rem;
		max-width: 60ch;
		white-space: pre-line;
	}
</style>
