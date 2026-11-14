<script lang="ts">
	import EpisodeFilters from '#lib/components/EpisodeFilters.svelte';
	import ShowDirectory from '#lib/components/ShowDirectory.svelte';
	import { directory } from '#lib/directory.svelte';
	import { monthsAgo } from '#lib/episodes';
	import { filters } from '#lib/filters.svelte';

	/** Hides shows last aired more than this many months ago, or none when null. */
	let hideOlderThan = $state<number | null>(24);

	const filteredDirectory = $derived.by(() => {
		const cutoff = hideOlderThan === null ? '' : monthsAgo(hideOlderThan);
		const { lastAired } = directory;

		// A show without a known date is kept, as its age is unknown
		return (
			directory.shows?.filter(
				(show) => filters.matchesShow(show) && (!lastAired[show.slug] || lastAired[show.slug] >= cutoff),
			) ?? null
		);
	});

	directory.refreshLastAired();
</script>

<EpisodeFilters shared>
	<label>
		hide shows
		<select bind:value={hideOlderThan}>
			<option value={null}>none</option>
			<option value={6}>older than 6 months</option>
			<option value={12}>older than 1 year</option>
			<option value={24}>older than 2 years</option>
			<option value={48}>older than 4 years</option>
		</select>
	</label>
</EpisodeFilters>

<h2>All Shows</h2>

<ShowDirectory shows={filteredDirectory} />

<style>
	h2 {
		margin: 0 0 0.5rem;
		font-size: 1.25rem;
		text-transform: uppercase;
	}
</style>
