<script lang="ts">
	import { invoke } from '@tauri-apps/api/core';
	import { untrack } from 'svelte';
	import EpisodeFilters from '#lib/components/EpisodeFilters.svelte';
	import EpisodeTable from '#lib/components/EpisodeTable.svelte';
	import { downloads } from '#lib/downloads.svelte';
	import { episodes } from '#lib/episodes.svelte';
	import { errors } from '#lib/errors.svelte';
	import { filters } from '#lib/filters.svelte';
	import { player } from '#lib/player.svelte';

	// Loved ids missing from the cache have no episode to list, so they're skipped
	const favEpisodes = $derived(
		episodes.list.filter((episode) => player.lovedIds.includes(episode.id) && filters.matchesStationsAndSearch(episode)),
	);

	/** The downloaded file of each listed episode that has one, by episode id. */
	let files = $state<Record<string, string>>({});

	// Joined, so updates that leave the ids as they were don't refetch. Empty while nothing is listed.
	const favIds = $derived(favEpisodes.map((episode) => episode.id).join());
	const filesKey = $derived(favIds && `${favIds}|${downloads.queue.downloaded.join()}`);

	// Fetched when the view opens and again whenever the listed episodes or the downloads change
	$effect(() => {
		if (!filesKey) {
			files = {};

			return;
		}

		const listed = untrack(() => $state.snapshot(favEpisodes));

		invoke<typeof files>('get_downloaded_files', { episodes: listed })
			.then((loaded) => {
				files = loaded;
			})
			.catch(errors.report);
	});
</script>

<EpisodeFilters shared />

{#if favEpisodes.length}
	<EpisodeTable episodes={favEpisodes} {files} />
{:else if episodes.loading}
	<p role="status">Loading episodes…</p>
{:else}
	<p>No episodes match the filters</p>
{/if}

<style>
	p {
		text-transform: uppercase;
		color: var(--muted);
	}
</style>
