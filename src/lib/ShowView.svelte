<script lang="ts">
	import EpisodeFilters from './EpisodeFilters.svelte';
	import EpisodeTable from './EpisodeTable.svelte';
	import { available, type DownloadQueue, type Episode, paragraphs, type Show, type ShowDetails, showOf } from './episodes';
	import SubscribeButton from './SubscribeButton.svelte';

	let {
		show,
		details,
		refreshing,
		episodes,
		subscribed,
		downloads,
		subscribing,
		playing,
		queued,
		onplay,
		onpause,
		onenqueue,
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
		playing: string | null;
		queued: string[];
		onplay: (episode: Episode) => void;
		onpause: () => void;
		onenqueue: (episode: Episode) => void;
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
				episode.showSlug === show.slug && (!mp3Only || available(episode)) && (!(hideRebroadcasts && episode.rebroadcast)),
		),
	);

	const description = $derived(details?.description ? paragraphs(details.description) : []);

	let expanded = $state(false);
	let overflowing = $state(false);
	let imageHeight = $state(0);
	let clip: HTMLDivElement | undefined = $state();

	$effect(() => {
		// Read so the clip is measured again when either changes
		// biome-ignore lint/suspicious/noUnusedExpressions: Svelte tracks reads as dependencies
		description;
		// biome-ignore lint/suspicious/noUnusedExpressions: as above
		imageHeight;

		if (clip && !expanded) {
			overflowing = clip.scrollHeight > clip.clientHeight;
		}
	});
</script>

<header>
	<button type="button" onclick={onback}>Back</button>
	<h1>{show.title}</h1>
	<SubscribeButton
		subscribed={subscribed.includes(show.slug)}
		disabled={subscribing.includes(show.slug)}
		onclick={() => ontogglesubscription(show)}
	/>
</header>

{#if details?.image || description.length}
	<section>
		{#if details?.image}
			<img src={details.image} alt="" bind:clientHeight={imageHeight} />
		{/if}
		<div class="description">
			<!-- On the clip itself: WebKit doesn't shrink a flex item to a column container's max-height.
			     Rounded down to whole lines, so no half-cut line sits above the button. -->
			<div
				class="clip"
				bind:this={clip}
				style:max-height={expanded ? null : `round(down, ${imageHeight ? `${imageHeight}px` : '12rem'}, 1lh)`}
			>
				{#each description as paragraph}
					<p>{paragraph}</p>
				{/each}
			</div>
			{#if expanded || overflowing}
				<button type="button" onclick={() => {
						expanded = !expanded;
					}}>{expanded ? 'Show less' : 'Show more'}</button>
			{/if}
		</div>
	</section>
{:else if refreshing}
	<p role="status">Refreshing…</p>
{/if}

<EpisodeFilters bind:mp3Only bind:hideRebroadcasts />

<EpisodeTable
	episodes={visibleEpisodes}
	{subscribed}
	{downloads}
	{subscribing}
	{playing}
	{queued}
	{onplay}
	{onpause}
	{onenqueue}
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

	[role='status'] {
		margin: 0 0 1rem;
	}

	img {
		width: 12rem;
		height: auto;
	}

	.description {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}

	.clip {
		overflow: hidden;
	}

	section p {
		/* A whole line, so every line stays on the clip's line grid */
		margin: 0 0 1lh;
		max-width: 60ch;
		white-space: pre-line;
	}
</style>
