<script lang="ts">
	import EpisodeFilters from '#lib/components/EpisodeFilters.svelte';
	import EpisodeTable from '#lib/components/EpisodeTable.svelte';
	import SubscribeButton from '#lib/components/SubscribeButton.svelte';
	import { type Episode, paragraphs, passesCheckboxes, type Show, type ShowDetails } from '#lib/episodes';
	import { episodes } from '#lib/episodes.svelte';

	let {
		show,
		details,
		refreshing,
		playing,
		onplay,
		onpause,
		onenqueue,
		onopenshow,
		onback,
	}: {
		show: Show;
		/** Null until the show's fetch returns. */
		details: ShowDetails | null;
		refreshing: boolean;
		playing: string | null;
		onplay: (episode: Episode) => void;
		onpause: () => void;
		onenqueue: (episode: Episode) => void;
		onopenshow: (episode: Episode) => void;
		onback: () => void;
	} = $props();

	/** Its own, not the shared filters, so each show opens with fresh ones. */
	const checkboxes = $state({ mp3Only: true, hideRebroadcasts: false });

	const visibleEpisodes = $derived(
		episodes.list.filter((episode) => episode.showSlug === show.slug && passesCheckboxes(episode, checkboxes)),
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
	<SubscribeButton {show} />
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

<EpisodeFilters bind:mp3Only={checkboxes.mp3Only} bind:hideRebroadcasts={checkboxes.hideRebroadcasts} />

<EpisodeTable
	episodes={visibleEpisodes}
	{playing}
	{onplay}
	{onpause}
	{onenqueue}
	{onopenshow}
	subscribable
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

	/* The player's cover: a square cropped to fit */
	img {
		flex: none;
		width: min(20rem, 50%);
		aspect-ratio: 1;
		object-fit: cover;
		background: black;
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
