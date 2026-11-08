<script lang="ts">
	import SubscribeButton from '#lib/components/SubscribeButton.svelte';
	import { directory } from '#lib/directory.svelte';
	import { type DirectoryShow, formatDate, type ShowSortColumn, type Sort, sortShows, toggleSort } from '#lib/episodes';
	import { openShow } from '#lib/navigation';

	let {
		shows,
	}: {
		/** The filtered directory, or null until the first refresh finishes. */
		shows: DirectoryShow[] | null;
	} = $props();

	const columns: [ShowSortColumn, string][] = [
		['title', 'Show'],
		['station', 'Station'],
		['lastAired', 'Last aired'],
	];

	/** Null keeps the directory order. */
	let sort = $state<Sort<ShowSortColumn> | null>(null);
	const direction = $derived(sort?.ascending ? 'ascending' : 'descending');

	const rows = $derived(shows && sortShows(shows, sort, directory.lastAired));
</script>

{#if rows === null}
	<p role="status">Loading the show directory…</p>
{:else if rows.length === 0}
	<p>No shows match the filters</p>
{:else}
	<table>
		<thead>
			<tr>
				{#each columns as [column, label]}
					<th class={column} aria-sort={sort?.column === column ? direction : undefined}>
						<button type="button" class="plain sort" onclick={() => {
							sort = toggleSort(sort, column, column !== 'lastAired');
						}}>
							{label}
							{#if sort?.column === column}
								<span aria-hidden="true">{sort.ascending ? '↑' : '↓'}</span>
							{/if}
						</button>
					</th>
				{/each}
				<th>Genres</th>
				<th class="actions"></th>
			</tr>
		</thead>
		<tbody>
			{#each rows as show (show.slug)}
				{@const aired = directory.lastAired[show.slug]}
				<tr>
					<td><button type="button" class="plain link" onclick={() => openShow(show.slug)}>{show.title}</button></td>
					<td title={show.station}>{show.station}</td>
					<td>{aired ? formatDate(aired) : ''}</td>
					<td title={show.genres.join(', ')}>{show.genres.join(', ')}</td>
					<td>
						<div class="buttons">
							<SubscribeButton {show} />
						</div>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}

<style>
	table {
		width: 100%;
		border-collapse: collapse;
		/* Column widths come from the header alone, so filtering never moves them */
		table-layout: fixed;
		text-transform: uppercase;
	}

	th,
	td {
		padding: 0.25rem 1ch;
		text-align: left;
		white-space: nowrap;
	}

	/* Room for a focused sort button's outline, which sits 4px outside it, so it clears both lines by 3px like a focused button in a row */
	th {
		padding-block: calc(0.25rem + 3px);
		border-bottom: 1px solid currentColor;
		font-weight: 700;
	}

	/* A row of `-` characters, as in the episode tables */
	/* Only values truncate, so a sort arrow never turns into an ellipsis */
	td {
		background: linear-gradient(to right, var(--muted) 60%, transparent 0) left bottom / 1ch 1px repeat-x;
		/* One more pixel below, since the line sits inside the padding, so a focused button is as far from it as from the row above */
		padding-bottom: calc(0.25rem + 1px);
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* The outer columns sit on the content edges, so their text and buttons line up with the headings, header buttons and bars */
	th:first-child,
	td:first-child {
		padding-left: 0;
	}

	/* The link truncates itself, so the cell can let a focused link's outline show past the edge */
	td:first-child {
		overflow: visible;
	}

	th:last-child,
	td:last-child {
		padding-right: 0;
	}

	/* Station and Last aired fit their heading with sort arrow, longer values truncate; Genres takes the rest */
	.title {
		width: 40%;
	}

	.station {
		width: 9ch;
	}

	.lastAired {
		width: 12ch;
	}

	/* The subscribe button */
	.actions {
		width: calc(1.5em + 2px);
	}

	/* Flex, so the cell is no taller than the button and every row is the same height */
	.buttons {
		justify-content: flex-end;
	}

	.sort {
		font-weight: inherit;
	}

	.link {
		text-align: left;
		text-decoration: underline;
		/* A button is an atomic inline, so it truncates its own text */
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		vertical-align: bottom;
	}

	p {
		text-transform: uppercase;
		color: var(--muted);
	}
</style>
