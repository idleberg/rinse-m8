<script lang="ts">
	import type { Snippet } from 'svelte';
	import { stations } from '#lib/episodes';
	import { filters } from '#lib/filters.svelte';

	/** `shared` adds the shared filters. The other checkboxes render only when bound, to `filters` or a view's own state. */
	let {
		shared = false,
		mp3Only = $bindable(),
		hideRebroadcasts = $bindable(),
		children,
	}: {
		/** Adds the search and station checkboxes, which every view shares. */
		shared?: boolean;
		mp3Only?: boolean;
		hideRebroadcasts?: boolean;
		/** More checkboxes for the options row, such as a setting the view wants next to its filters. */
		children?: Snippet;
	} = $props();
</script>

<!-- Outside the fieldset, so it scrolls away while the checkboxes stay pinned -->
{#if shared}
	<input type="search" bind:value={filters.search} placeholder="Filter title, show, genres" aria-label="Search" />
{/if}

<fieldset aria-label="Filters">
	{#if shared}
		<div class="row">
			{#each stations as station (station)}
				<label><input type="checkbox" bind:group={filters.shownStations} value={station} /> {station}</label>
			{/each}
		</div>
	{/if}
	{#if mp3Only !== undefined || hideRebroadcasts !== undefined || children}
		<div class="row">
			{#if mp3Only !== undefined}
				<label><input type="checkbox" bind:checked={mp3Only} /> download available</label>
			{/if}
			{#if hideRebroadcasts !== undefined}
				<label><input type="checkbox" bind:checked={hideRebroadcasts} /> hide rebroadcasts</label>
			{/if}
			{@render children?.()}
		</div>
	{/if}
</fieldset>

<style>
	fieldset {
		display: grid;
		gap: 0.5rem;
		margin: 0 0 0.5rem;
		border: none;
		padding: 0.5rem 0;
		text-transform: uppercase;
	}

	.row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1rem;
	}

	input[type='search'] {
		width: 100%;
		text-transform: uppercase;
	}

	/* Form controls don't inherit text-transform */
	input,
	input::placeholder {
		text-transform: inherit;
	}
</style>
