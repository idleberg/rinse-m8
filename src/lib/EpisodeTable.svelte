<script lang="ts">
	import DownloadButton from './DownloadButton.svelte';
	import {
		available,
		type DownloadQueue,
		defaultSort,
		type Episode,
		formatDate,
		type SortColumn,
		sortEpisodes,
		toggleSort,
	} from './episodes';
	import SubscribeButton from './SubscribeButton.svelte';

	let {
		episodes,
		limit,
		subscribed,
		downloads,
		subscribing,
		playing,
		onplay,
		onpause,
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
		/** The id of the episode while it's playing. */
		playing: string | null;
		onplay: (episode: Episode) => void;
		onpause: () => void;
		ondownload: (episode: Episode) => void;
		/** Adds a "Mark as downloaded" button next to each download button. */
		onmark?: (episode: Episode) => void;
		onopenshow: (episode: Episode) => void;
		/** Adds a subscribe button to each row. */
		ontogglesubscription?: (episode: Episode) => void;
	} = $props();

	const columns: [SortColumn, string][] = [
		['date', 'Date'],
		['time', 'Time'],
		['station', 'Station'],
		['show', 'Show'],
	];

	let sort = $state(defaultSort);
	const direction = $derived(sort.ascending ? 'ascending' : 'descending');

	const rows = $derived(sortEpisodes(episodes, sort).slice(0, limit));
</script>

<table>
	<thead>
		<tr>
			{#each columns as [column, label]}
				<th class={column} aria-sort={sort.column === column ? direction : undefined}>
					<button type="button" class="sort" onclick={() => {
						sort = toggleSort(sort, column);
					}}>
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
				<td>{episode.time}</td>
				<td>{episode.station}</td>
				<td>
					<button type="button" class="link" onclick={() => onopenshow(episode)}>{episode.showTitle}</button>
					{#if episode.displayTitle}
						<span class="subtitle">{episode.displayTitle}</span>
					{/if}
				</td>
				<td>
					{#if episode.rebroadcast}
						<span class="badge">Rebroadcast</span>
					{/if}
				</td>
				<td>
					<div class="actions">
						{#if available(episode)}
							{#if playing === episode.id}
								<button type="button" class="icon" aria-label="Pause" title="Pause" onclick={onpause}>
									<svg viewBox="0 0 16 16" aria-hidden="true">
										<path d="M5 3v10M11 3v10" />
									</svg>
								</button>
							{:else}
								<button type="button" class="icon" aria-label="Play" title="Play" onclick={() => onplay(episode)}>
									<svg viewBox="0 0 16 16" aria-hidden="true">
										<path d="M4 2.5l9 5.5-9 5.5z" />
									</svg>
								</button>
							{/if}
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

	/* Each fits its longest value or heading with sort arrow, so columns line up across tables; Show takes the rest */
	.date {
		width: 10ch;
	}

	.time {
		width: 6ch;
	}

	.station {
		width: 9ch;
	}

	.show {
		width: 100%;
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

	.subtitle {
		color: var(--muted);
	}

	.badge {
		color: var(--accent);
	}
</style>
