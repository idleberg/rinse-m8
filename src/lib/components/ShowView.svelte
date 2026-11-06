<script lang="ts">
	import { invoke } from '@tauri-apps/api/core';
	import Artwork from '#lib/components/Artwork.svelte';
	import EpisodeFilters from '#lib/components/EpisodeFilters.svelte';
	import EpisodeTable from '#lib/components/EpisodeTable.svelte';
	import SubscribeButton from '#lib/components/SubscribeButton.svelte';
	import { type DirectoryShow, paragraphs, passesCheckboxes, type Show, type ShowDetails, type ShowPage } from '#lib/episodes';
	import { episodes } from '#lib/episodes.svelte';
	import { errors } from '#lib/errors.svelte';
	import { lastfm } from '#lib/lastfm.svelte';
	import { openShow } from '#lib/navigation';
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
	let recommended = $state<(DirectoryShow & { image: string | null })[]>([]);

	/** The directory has no artwork, so it comes from a cached episode, the show's record, or else fetching the show,
	 * which records it for next time. A record without an image means Rinse has none. */
	const artwork = async (showSlug: string) => {
		const cached = episodes.list.find((episode) => episode.showSlug === showSlug && episode.showImage)?.showImage;

		if (cached) {
			return cached;
		}

		const record = await invoke<ShowDetails | null>('get_show_record', { slug: showSlug }).catch(() => null);

		if (record) {
			return record.image;
		}

		const page = await invoke<ShowPage>('refresh_show', { slug: showSlug }).catch(() => null);

		return page?.details.image ?? null;
	};

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
			.then((shows) =>
				Promise.all(shows.slice(0, 5).map(async (found) => ({ ...found, image: await artwork(found.slug) }))),
			)
			.then((shows) => {
				if (current) {
					recommended = shows;
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
	<ul class="gallery">
		{#each recommended as recommendation (recommendation.slug)}
			<li>
				<button type="button" class="plain" onclick={() => openShow(recommendation.slug)}>
					<Artwork src={recommendation.image} empty="No artwork" />
					<span>{recommendation.title}</span>
				</button>
			</li>
		{/each}
	</ul>
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

	/* One row, scrolling sideways when the window is too narrow for every show */
	.gallery {
		display: flex;
		gap: 1rem;
		margin: 0;
		padding: 0 0 0.5rem;
		overflow-x: auto;
		list-style: none;
	}

	.gallery li {
		flex: none;
		width: 10rem;
	}

	.gallery button {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		width: 100%;
		text-align: left;
		text-transform: uppercase;
	}

	.gallery :global(.artwork) {
		width: 100%;
	}

	.gallery span {
		text-decoration: underline;
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
