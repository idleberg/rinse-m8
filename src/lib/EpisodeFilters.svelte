<script lang="ts">
	import type { Snippet } from 'svelte';
	import { stations } from './episodes';

	/** Each filter renders only when its prop is bound, so a view picks its filters by binding them. */
	let {
		shownStations = $bindable(),
		mp3Only = $bindable(),
		hideRebroadcasts = $bindable(),
		search = $bindable(),
		children,
	}: {
		shownStations?: string[];
		mp3Only?: boolean;
		hideRebroadcasts?: boolean;
		search?: string;
		/** More checkboxes for the options row, such as a setting the view wants next to its filters. */
		children?: Snippet;
	} = $props();
</script>

<!-- Outside the fieldset, so it scrolls away while the checkboxes stay pinned -->
{#if search !== undefined}
	<input type="search" bind:value={search} placeholder="Filter title, show, genres" aria-label="Search" />
{/if}

<fieldset aria-label="Filters">
	{#if shownStations !== undefined}
		<div class="row">
			{#each stations as station (station)}
				<label><input type="checkbox" bind:group={shownStations} value={station} /> {station}</label>
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
