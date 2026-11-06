<script lang="ts">
	import { invoke } from '@tauri-apps/api/core';
	import type { Snippet } from 'svelte';
	import Artwork from '#lib/components/Artwork.svelte';
	import type { DirectoryShow, ShowDetails, ShowPage } from '#lib/episodes';
	import { episodes } from '#lib/episodes.svelte';
	import { errors } from '#lib/errors.svelte';
	import { lastfm } from '#lib/lastfm.svelte';
	import { openShow } from '#lib/navigation';

	let {
		artist,
		children,
	}: {
		/** Usually a show title, the real artist on Last.fm. Null skips the lookup. */
		artist: string | null;
		/** Shown above the gallery, such as a heading. */
		children?: Snippet;
	} = $props();

	/** The 5 best shows for fans of the artist, best first. */
	let recommended = $state<(DirectoryShow & { image: string | null })[]>([]);

	/** The directory has no artwork, so it comes from a cached episode, the show's record, or else fetching the show,
	 * which records it for next time. A record without an image means Rinse has none. */
	const artwork = async (slug: string) => {
		const cached = episodes.list.find((episode) => episode.showSlug === slug && episode.showImage)?.showImage;

		if (cached) {
			return cached;
		}

		const record = await invoke<ShowDetails | null>('get_show_record', { slug }).catch(() => null);

		if (record) {
			return record.image;
		}

		const page = await invoke<ShowPage>('refresh_show', { slug }).catch(() => null);

		return page?.details.image ?? null;
	};

	$effect(() => {
		let current = true;

		recommended = [];

		if (!(lastfm.account?.user && artist)) {
			return;
		}

		invoke<DirectoryShow[]>('get_recommended_shows', { artist })
			.then((shows) =>
				Promise.all(shows.slice(0, 5).map(async (show) => ({ ...show, image: await artwork(show.slug) }))),
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
</script>

{#if lastfm.account?.user && recommended.length > 0}
	{@render children?.()}
	<p class="intro">If you like {artist}, check out these shows by similar artists.</p>
	<ul class="gallery">
		{#each recommended as show (show.slug)}
			<li>
				<button type="button" class="plain" onclick={() => openShow(show.slug)}>
					<Artwork src={show.image} empty="No artwork" />
					<span>{show.title}</span>
				</button>
			</li>
		{/each}
	</ul>
{/if}

<style>
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

	li {
		flex: none;
		width: 10rem;
	}

	button {
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

	span {
		text-decoration: underline;
	}
</style>
