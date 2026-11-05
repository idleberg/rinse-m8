<script lang="ts">
	import EpisodeFilters from '#lib/components/EpisodeFilters.svelte';
	import EpisodeTable from '#lib/components/EpisodeTable.svelte';
	import { episodes } from '#lib/episodes.svelte';
	import { filters } from '#lib/filters.svelte';

	const scheduleEpisodes = $derived(episodes.list.filter((episode) => episode.scheduled && filters.matchesEpisode(episode)));
</script>

<EpisodeFilters shared bind:mp3Only={filters.mp3Only} bind:hideRebroadcasts={filters.hideRebroadcasts} />

{#if scheduleEpisodes.length}
	<EpisodeTable episodes={scheduleEpisodes} subscribable groupDates />
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
