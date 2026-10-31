<script lang="ts">
	import DownloadButton from './DownloadButton.svelte';
	import SubscribeButton from './SubscribeButton.svelte';
	import {
		type DownloadQueue,
		type Episode,
		type SortColumn,
		defaultSort,
		formatDate,
		sortEpisodes,
		toggleSort,
	} from './episodes';

	let {
		episodes,
		limit,
		subscribed,
		downloads,
		subscribing,
		ondownload,
		onmark,
		onopenshow,
		ontogglesubscription,
	}: {
		episodes: Episode[];
		/** Shows only the first `limit` episodes, after sorting. */
		limit?: number;
		/** Show slugs. */
		subscribed: string[];
		downloads: DownloadQueue;
		/** Show slugs. */
		subscribing: string[];
		ondownload: (episode: Episode) => void;
		/** Adds a "Mark as downloaded" button next to each download button. */
		onmark?: (episode: Episode) => void;
		onopenshow: (episode: Episode) => void;
		/** Adds a subscribe button to each row. */
		ontogglesubscription?: (episode: Episode) => void;
	} = $props();

	const columns: [SortColumn, string][] = [
		['date', 'Date'],
		['station', 'Station'],
		['show', 'Show'],
		['title', 'Title'],
	];

	let sort = $state(defaultSort);

	const rows = $derived(sortEpisodes(episodes, sort).slice(0, limit));
</script>

<table>
	<thead>
		<tr>
			{#each columns as [column, label]}
				<th aria-sort={sort.column === column ? (sort.ascending ? 'ascending' : 'descending') : undefined}>
					<button class="sort" onclick={() => (sort = toggleSort(sort, column))}>
						{label}
						{#if sort.column === column}
							<span aria-hidden="true">{sort.ascending ? '↑' : '↓'}</span>
						{/if}
					</button>
				</th>
			{/each}
			<th></th>
			<th></th>
		</tr>
	</thead>
	<tbody>
		{#each rows as episode (episode.id)}
			<tr>
				<td>{formatDate(episode.date)}</td>
				<td>{episode.station}</td>
				<td><button class="link" onclick={() => onopenshow(episode)}>{episode.showTitle}</button></td>
				<td>{episode.title}</td>
				<td>
					{#if episode.rebroadcast}
						<span class="badge">Rebroadcast</span>
					{/if}
				</td>
				<td>
					<div class="actions">
						{#if episode.mp3}
							<DownloadButton {episode} {downloads} {ondownload} {onmark} />
						{/if}
						{#if ontogglesubscription}
							<SubscribeButton
								subscribed={subscribed.includes(episode.showSlug)}
								disabled={subscribing.includes(episode.showSlug)}
								onclick={() => ontogglesubscription(episode)}
							/>
						{/if}
					</div>
				</td>
			</tr>
		{/each}
	</tbody>
</table>

<style>
	table {
		width: 100%;
		border-collapse: collapse;
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

	/* A row of `-` characters: a 1ch-wide tile, mostly dash, repeated along the bottom edge */
	td {
		background: linear-gradient(to right, var(--muted) 60%, transparent 0) left bottom / 1ch 1px repeat-x;
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
	}

	.actions {
		display: flex;
		gap: 0.5ch;
		justify-content: flex-end;
		align-items: center;
	}

	.badge {
		color: var(--accent);
	}
</style>
