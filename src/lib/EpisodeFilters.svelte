<script lang="ts">
	import { stations } from './episodes';

	/** Each filter renders only when its prop is bound, so a view picks its filters by binding them. */
	let {
		shownStations = $bindable(),
		mp3Only = $bindable(),
		hideRebroadcasts = $bindable(),
		search = $bindable(),
	}: {
		shownStations?: string[];
		mp3Only?: boolean;
		hideRebroadcasts?: boolean;
		search?: string;
	} = $props();
</script>

<fieldset aria-label="Filters">
	{#if shownStations !== undefined}
		{#each stations as station (station)}
			<label><input type="checkbox" bind:group={shownStations} value={station} /> {station}</label>
		{/each}
	{/if}
	{#if mp3Only !== undefined}
		<label><input type="checkbox" bind:checked={mp3Only} /> mp3 available only</label>
	{/if}
	{#if hideRebroadcasts !== undefined}
		<label><input type="checkbox" bind:checked={hideRebroadcasts} /> hide rebroadcasts</label>
	{/if}
	{#if search !== undefined}
		<input type="search" bind:value={search} placeholder="Search title, show, genres" aria-label="Search" />
	{/if}
</fieldset>

<style>
	fieldset {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1rem;
		align-items: center;
		margin: 0 0 1rem;
		border: none;
		padding: 0;
	}
</style>
