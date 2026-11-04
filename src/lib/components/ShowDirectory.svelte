<script lang="ts">
	import SubscribeButton from '#lib/components/SubscribeButton.svelte';
	import { type DirectoryShow, formatDate, type Show, type ShowSortColumn, type Sort, sortShows, toggleSort } from '#lib/episodes';

	let {
		shows,
		lastAired,
		subscribed,
		subscribing,
		onopenshow,
		ontogglesubscription,
	}: {
		/** The filtered directory, or null until the first refresh finishes. */
		shows: DirectoryShow[] | null;
		/** Dates keyed by show slug. */
		lastAired: Record<string, string>;
		/** Show slugs. */
		subscribed: string[];
		/** Show slugs. */
		subscribing: string[];
		onopenshow: (show: Show) => void;
		ontogglesubscription: (show: Show) => void;
	} = $props();

	const columns: [ShowSortColumn, string][] = [
		['title', 'Show'],
		['station', 'Station'],
		['lastAired', 'Last aired'],
	];

	/** Null keeps the directory order. */
	let sort = $state<Sort<ShowSortColumn> | null>(null);
	const direction = $derived(sort?.ascending ? 'ascending' : 'descending');

	const rows = $derived(shows && sortShows(shows, sort, lastAired));
</script>

{#if rows === null}
	<p role="status">Loading the show directory…</p>
{:else}
	<table>
		<thead>
			<tr>
				{#each columns as [column, label]}
					<th class={column} aria-sort={sort?.column === column ? direction : undefined}>
						<button type="button" class="sort" onclick={() => {
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
				<tr>
					<td><button type="button" class="link" onclick={() => onopenshow(show)}>{show.title}</button></td>
					<td title={show.station}>{show.station}</td>
					<td>{lastAired[show.slug] ? formatDate(lastAired[show.slug]) : ''}</td>
					<td title={show.genres.join(', ')}>{show.genres.join(', ')}</td>
					<td>
						<div class="buttons">
							<SubscribeButton
								subscribed={subscribed.includes(show.slug)}
								disabled={subscribing.includes(show.slug)}
								onclick={() => ontogglesubscription(show)}
							/>
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

	th {
		border-bottom: 1px solid currentColor;
		font-weight: 700;
	}

	/* A row of `-` characters, as in the episode tables */
	/* Only values truncate, so a sort arrow never turns into an ellipsis */
	td {
		background: linear-gradient(to right, var(--muted) 60%, transparent 0) left bottom / 1ch 1px repeat-x;
		overflow: hidden;
		text-overflow: ellipsis;
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
		border: none;
		padding: 0;
		font-weight: inherit;
	}

	.link {
		border: none;
		padding: 0;
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
