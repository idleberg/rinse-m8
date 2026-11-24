<script lang="ts">
	import Artwork from '#lib/components/Artwork.svelte';
	import EpisodeFilters from '#lib/components/EpisodeFilters.svelte';
	import EpisodeTable from '#lib/components/EpisodeTable.svelte';
	import Recommendations from '#lib/components/Recommendations.svelte';
	import SubscribeButton from '#lib/components/SubscribeButton.svelte';
	import { paragraphs, passesCheckboxes, type Show, type ShowDetails, truncate } from '#lib/episodes';
	import { episodes } from '#lib/episodes.svelte';
	import { goto } from '$app/navigation';

	let {
		show,
		details,
		refreshing,
	}: {
		show: Show;
		/** The show record until the show's fetch returns, or null when there's none. */
		details: ShowDetails | null;
		refreshing: boolean;
	} = $props();

	/** Its own, not the shared filters, so each show opens with fresh ones. */
	const checkboxes = $state({ mp3Only: true, hideRebroadcasts: false });
	let search = $state('');

	const visibleEpisodes = $derived.by(() => {
		const query = search.trim().toLowerCase();

		return episodes.list.filter(
			(episode) =>
				episode.showSlug === show.slug &&
				passesCheckboxes(episode, checkboxes) &&
				[episode.title, episode.displayTitle ?? '', ...episode.genres].some((text) =>
					text.toLowerCase().includes(query),
				),
		);
	});

	const description = $derived(details?.description ? paragraphs(details.description) : []);

	let expanded = $state(false);
	let imageHeight = $state(0);
	let buttonHeight = $state(0);
	let clipWidth = $state(0);
	let clip: HTMLDivElement | undefined = $state();

	/** The description cut to end above the button, or null when it all fits beside the image. */
	let shown: string[] | null = $state(null);
	const overflowing = $derived(shown !== null);
	const visible = $derived(expanded || !shown ? description : shown);

	$effect(() => {
		if (clip && imageHeight && clipWidth) {
			shown = shortened(clip, clipWidth, imageHeight, buttonHeight);
		}
	});

	/**
	 * Lays the description out in a hidden copy of `element`, `width` wide. Null when it fits in `height`, else the most
	 * words that fit once the button and its gap are taken off it, found by binary search.
	 */
	function shortened(element: HTMLDivElement, width: number, height: number, button: number): string[] | null {
		const blocks = description;
		const probe = element.cloneNode() as HTMLDivElement;
		// Scoped styles match by class, so new paragraphs take their sibling's
		const className = element.firstElementChild?.className ?? '';

		const fits = (texts: string[], limit: string) => {
			probe.style.maxHeight = limit;
			probe.replaceChildren(
				...texts.map((textContent) => Object.assign(document.createElement('p'), { className, textContent })),
			);

			return probe.scrollHeight <= probe.clientHeight;
		};

		Object.assign(probe.style, { position: 'absolute', visibility: 'hidden', width: `${width}px` });
		element.after(probe);

		try {
			if (fits(blocks, `${height}px`)) {
				return null;
			}

			const limit = `round(down, ${height}px - ${button}px - var(--gap), 1lh)`;
			// No block has more words than characters
			let low = 1;
			let high = blocks.join('').length;

			while (low < high) {
				const middle = Math.ceil((low + high) / 2);

				if (fits(truncate(blocks, middle), limit)) {
					low = middle;
				} else {
					high = middle - 1;
				}
			}

			return truncate(blocks, low);
		} finally {
			probe.remove();
		}
	}

	/** The image's height, less the button and its gap when it shows, so the two together end with the image. */
	const maxHeight = $derived.by(() => {
		if (expanded) {
			return null;
		}

		if (!imageHeight) {
			return '12rem';
		}

		const button = overflowing ? ` - ${buttonHeight}px - var(--gap)` : '';

		return `round(down, ${imageHeight}px${button}, 1lh)`;
	});
</script>

<header>
	<!-- A show opened by a reload or a notification has nothing to go back to, so it goes to the Shows tab -->
	<button type="button" onclick={() => (history.length > 1 ? history.back() : goto('/shows'))}>Back</button>
	<h1>{show.title}</h1>
	<SubscribeButton {show} />
</header>

<section>
	<Artwork src={details?.image} empty={refreshing ? undefined : 'No artwork for this show'} bind:height={imageHeight} />
	<div class="description">
		{#if description.length}
			<!-- On the clip itself: WebKit doesn't shrink a flex item to a column container's max-height.
			     Rounded down to whole lines, so no half-cut line sits above the button. -->
			<div class="clip" bind:this={clip} bind:clientWidth={clipWidth} style:max-height={maxHeight}>
				{#each visible as paragraph}
					<p>{paragraph}</p>
				{/each}
			</div>
			{#if expanded || overflowing}
				<button type="button" bind:offsetHeight={buttonHeight} onclick={() => {
						expanded = !expanded;
					}}>{expanded ? 'Show less' : 'Show more'}</button>
			{/if}
		{:else if refreshing}
			<p role="status">Loading show data…</p>
		{/if}
	</div>
</section>

<EpisodeFilters
	bind:search
	bind:mp3Only={checkboxes.mp3Only}
	bind:hideRebroadcasts={checkboxes.hideRebroadcasts}
/>

{#if visibleEpisodes.length}
	<EpisodeTable episodes={visibleEpisodes} linkShows={false} subscribable />
{:else if episodes.loading || refreshing}
	<p class="empty" role="status">Loading episodes…</p>
{:else}
	<p class="empty">No episodes match the filters</p>
{/if}

<!-- A reload has only the slug standing in for the title, which would look up the wrong artist -->
<Recommendations artist={show.title === show.slug ? null : show.title}>
	<h2>Recommended shows</h2>
</Recommendations>

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
		text-transform: var(--case);
	}

	h2 {
		margin: 2rem 0 0.5rem;
		font-size: 1.25rem;
		text-transform: var(--case);
	}

	section {
		display: flex;
		gap: 1rem;
		align-items: flex-start;
		margin: 0 0 1rem;
	}

	[role='status'] {
		text-transform: var(--case);
	}

	.empty {
		text-transform: var(--case);
		color: var(--muted);
	}

	.description {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		/* Also taken off the clip's height when the button shows */
		--gap: 0.5rem;
		gap: var(--gap);
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

	section p:last-child {
		margin-bottom: 0;
	}
</style>
