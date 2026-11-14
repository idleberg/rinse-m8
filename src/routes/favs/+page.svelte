<script lang="ts">
	import { invoke } from '@tauri-apps/api/core';
	import { untrack } from 'svelte';
	import EpisodeFilters from '#lib/components/EpisodeFilters.svelte';
	import EpisodeTable from '#lib/components/EpisodeTable.svelte';
	import { downloads } from '#lib/downloads.svelte';
	import { deadFav, favOptions, matchesFavFilters } from '#lib/episodes';
	import { episodes } from '#lib/episodes.svelte';
	import { errors } from '#lib/errors.svelte';
	import { filters } from '#lib/filters.svelte';
	import { player } from '#lib/player.svelte';

	// From the whole cache, as FAVS has its own rule for dead. Loved ids missing from the cache have no episode to list, so
	// they're skipped.
	const loved = $derived(episodes.all.filter((episode) => player.lovedIds.includes(episode.id)));

	// From all loved episodes, so the shared filters don't empty the dropdowns. Not remembered across restarts.
	const options = $derived(favOptions(loved));
	let genre = $state<string | null>(null);
	let show = $state<string | null>(null);

	// Unloving the last episode of the chosen genre or show drops its option, so the dropdown falls back to "All"
	$effect(() => {
		if (genre !== null && !options.genres.includes(genre)) {
			genre = null;
		}

		if (show !== null && !options.shows.some(({ slug }) => slug === show)) {
			show = null;
		}
	});

	/** Not remembered across restarts. */
	let showDead = $state(false);

	/** The downloaded file of each loved episode that has one, by episode id. Of every loved episode, not just the listed
	 * ones, since a file decides whether a favourite is dead. */
	let files = $state<Record<string, string>>({});

	const favEpisodes = $derived(
		loved.filter(
			(episode) =>
				(showDead || !deadFav(episode, files[episode.id])) &&
				filters.matchesStationsAndSearch(episode) &&
				matchesFavFilters(episode, { genre, show }),
		),
	);

	// Joined, so updates that leave the ids as they were don't refetch. Empty while nothing is loved.
	const lovedKey = $derived(loved.map((episode) => episode.id).join());
	const filesKey = $derived(lovedKey && `${lovedKey}|${downloads.queue.downloaded.join()}`);

	// Fetched when the view opens and again whenever the loved episodes or the downloads change
	$effect(() => {
		if (!filesKey) {
			files = {};

			return;
		}

		const lovedEpisodes = untrack(() => $state.snapshot(loved));

		invoke<typeof files>('get_downloaded_files', { episodes: lovedEpisodes })
			.then((loaded) => {
				files = loaded;
			})
			.catch(errors.report);
	});
</script>

<EpisodeFilters shared>
	<label>
		genre
		<select bind:value={genre}>
			<option value={null}>All genres</option>
			{#each options.genres as name (name)}
				<option value={name}>{name}</option>
			{/each}
		</select>
	</label>
	<label>
		show
		<select bind:value={show}>
			<option value={null}>All shows</option>
			{#each options.shows as { slug, title } (slug)}
				<option value={slug}>{title}</option>
			{/each}
		</select>
	</label>
	<label><input type="checkbox" bind:checked={showDead} /> show missing episodes</label>
</EpisodeFilters>

<h2>Your Favourites</h2>

{#if favEpisodes.length}
	<EpisodeTable episodes={favEpisodes} {files} plays={player.plays} />
{:else if episodes.loading}
	<p role="status">Loading episodes…</p>
{:else}
	<p>No episodes match the filters</p>
{/if}

<style>
	h2 {
		margin: 0 0 0.5rem;
		font-size: 1.25rem;
		text-transform: uppercase;
	}

	p {
		text-transform: uppercase;
		color: var(--muted);
	}
</style>
