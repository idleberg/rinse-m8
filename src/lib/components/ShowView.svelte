<script lang="ts">
	import { invoke } from '@tauri-apps/api/core';
	import Artwork from '#lib/components/Artwork.svelte';
	import EpisodeFilters from '#lib/components/EpisodeFilters.svelte';
	import EpisodeTable from '#lib/components/EpisodeTable.svelte';
	import ShowDirectory from '#lib/components/ShowDirectory.svelte';
	import SubscribeButton from '#lib/components/SubscribeButton.svelte';
	import { type DirectoryShow, paragraphs, passesCheckboxes, type Show, type ShowDetails } from '#lib/episodes';
	import { episodes } from '#lib/episodes.svelte';
	import { errors } from '#lib/errors.svelte';
	import { lastfm } from '#lib/lastfm.svelte';
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

	const visibleEpisodes = $derived(
		episodes.list.filter((episode) => episode.showSlug === show.slug && passesCheckboxes(episode, checkboxes)),
	);

	/** The 5 best shows for fans of this one, best first. Empty until the lookup finishes or when nothing matches. */
	let recommended = $state<DirectoryShow[]>([]);

	// Strings, so the lookup only runs again when the title changes, not whenever the parent builds a new `show`
	const slug = $derived(show.slug);
	const title = $derived(show.title);

	// The title is the artist on Last.fm, so the lookup waits for the real one to replace the slug standing in for it
	$effect(() => {
		let current = true;

		if (!lastfm.account?.user || title === slug) {
			return;
		}

		invoke<DirectoryShow[]>('get_recommended_shows', { artist: title })
			.then((shows) => {
				if (current) {
					recommended = shows.slice(0, 5);
				}
			})
			.catch(errors.report);

		return () => {
			current = false;
		};
	});

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
		{:else if refreshing}
			<p role="status">Loading show data…</p>
		{/if}
	</div>
</section>

<EpisodeFilters bind:mp3Only={checkboxes.mp3Only} bind:hideRebroadcasts={checkboxes.hideRebroadcasts} />

<EpisodeTable episodes={visibleEpisodes} subscribable />

{#if lastfm.account?.user && recommended.length > 0}
	<h2>Recommended shows</h2>
	<p class="intro">If you like {show.title}, check out these shows by similar artists.</p>
	<ShowDirectory shows={recommended} />
{/if}

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

	h2 {
		margin: 2rem 0 0.5rem;
		font-size: 1.25rem;
		text-transform: uppercase;
	}

	.intro {
		margin: 0 0 1rem;
		text-transform: uppercase;
	}

	section {
		display: flex;
		gap: 1rem;
		align-items: flex-start;
		margin: 0 0 1rem;
	}

	[role='status'] {
		text-transform: uppercase;
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
