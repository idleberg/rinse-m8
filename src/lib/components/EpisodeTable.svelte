<script lang="ts">
	import { revealItemInDir } from '@tauri-apps/plugin-opener';
	import { untrack } from 'svelte';
	import DownloadButton from '#lib/components/DownloadButton.svelte';
	import SubscribeButton from '#lib/components/SubscribeButton.svelte';
	import { downloads } from '#lib/downloads.svelte';
	import {
		available,
		defaultSort,
		type Episode,
		formatDate,
		mostPlayed,
		type SortColumn,
		showOf,
		sortEpisodes,
		toggleSort,
	} from '#lib/episodes';
	import { errors } from '#lib/errors.svelte';
	import { openShow } from '#lib/navigation';
	import { player } from '#lib/player.svelte';

	let {
		episodes,
		files,
		groupDates = false,
		limit,
		linkShows = true,
		markable = false,
		plays,
		subscribable = false,
		subscribeOnHover = false,
	}: {
		episodes: Episode[];
		/** The downloaded file per episode id. When given, an episode with a file gets a "Show in folder" button in
		 * place of the download button, and a Play button even when its mp3 got a 404. */
		files?: Record<string, string>;
		/** Shows each date only in the first of its rows, while sorted by date. */
		groupDates?: boolean;
		/** Shows only the first `limit` episodes, after sorting. */
		limit?: number;
		/** Links each show name to its show view. Off where the table already is that view. */
		linkShows?: boolean;
		/** Adds a "Mark as downloaded" button next to each download button. */
		markable?: boolean;
		/** How often each episode has been played, by episode id. When given, the table has a Plays column and starts out
		 * sorted by it. */
		plays?: Record<string, number>;
		/** Adds a subscribe button to each row. */
		subscribable?: boolean;
		/** Moves the subscribe button before the other actions, shown while the row is hovered. */
		subscribeOnHover?: boolean;
	} = $props();

	const columns: [SortColumn, string][] = $derived([
		['date', 'Date'],
		['time', 'Time'],
		['station', 'Station'],
		['show', 'Show'],
		...(plays ? [['plays', 'Plays'] as [SortColumn, string]] : []),
	]);

	let sort = $state(untrack(() => (plays ? mostPlayed : defaultSort)));
	const direction = $derived(sort.ascending ? 'ascending' : 'descending');

	const rows = $derived(sortEpisodes(episodes, sort, plays).slice(0, limit));
</script>

<table>
	<thead>
		<tr>
			{#each columns as [column, label]}
				<th class={column} aria-sort={sort.column === column ? direction : undefined}>
					<button type="button" class="plain sort" onclick={() => {
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
		{#each rows as episode, i (episode.id)}
			<tr class={{ failed: downloads.queue.failures.some((e) => e.id === episode.id) }}>
				<td>
					{#if !groupDates || sort.column !== 'date'}
						{formatDate(episode.date)}
					{:else if rows[i - 1]?.date !== episode.date}
						<strong>{formatDate(episode.date)}</strong>
					{/if}
				</td>
				<td>{episode.time}</td>
				<td>{episode.station}</td>
				<td class="show">
					{#if linkShows}
						<button type="button" class="plain link" onclick={() => openShow(episode.showSlug)}>{episode.showTitle}</button>
					{:else}
						{episode.showTitle}
					{/if}
					{#if episode.displayTitle}
						<span class="subtitle">{episode.displayTitle}</span>
					{/if}
				</td>
				{#if plays}
					<td class="plays">{plays[episode.id] ?? 0}</td>
				{/if}
				<td>
					{#if episode.rebroadcast}
						<span class="badge">Rebroadcast</span>
					{/if}
				</td>
				<td>
					<div class="buttons">
						{#if subscribable && subscribeOnHover}
							<span class="reveal">
								<SubscribeButton show={showOf(episode)} />
							</span>
						{/if}
						<!-- A download plays from disk even when its mp3 got a 404 -->
						{#if available(episode) || files?.[episode.id]}
							{#if player.playing === episode.id}
								<button type="button" class="icon" aria-label="Pause" title="Pause" onclick={player.pause}>
									<svg viewBox="0 0 16 16" aria-hidden="true">
										<path d="M5 3v10M11 3v10" />
									</svg>
								</button>
							{:else}
								<button type="button" class="icon" aria-label="Play" title="Play" onclick={() => player.playOrQueue(episode)}>
									<svg viewBox="0 0 16 16" aria-hidden="true">
										<path d="M4 2.5l9 5.5-9 5.5z" />
									</svg>
								</button>
							{/if}
						{/if}
						{#if files?.[episode.id]}
							{@const file = files[episode.id]}
							<button type="button" class="icon" aria-label="Show in folder" title="Show in folder" onclick={() => revealItemInDir(file).catch(errors.report)}>
								<svg viewBox="0 0 16 16" aria-hidden="true">
									<circle cx="7" cy="7" r="4.5" />
									<path d="M10.5 10.5L14 14" />
								</svg>
							</button>
						{:else if available(episode)}
							<DownloadButton {episode} {markable} fileMissing={files !== undefined} />
						{/if}
						{#if subscribable && !subscribeOnHover}
							<SubscribeButton show={showOf(episode)} />
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

	/* Room for a focused sort button's outline, which sits 4px outside it, so it clears both lines by 3px like a focused button in a row */
	th {
		padding-block: calc(0.25rem + 3px);
		border-bottom: 1px solid currentColor;
		font-weight: 700;
	}

	/* A row of `-` characters: a 1ch-wide tile, mostly dash, repeated along the bottom edge */
	td {
		background: linear-gradient(to right, currentColor 60%, transparent 0) left bottom / 1ch 1px repeat-x;
		/* One more pixel below, since the line sits inside the padding, so a focused button is as far from it as from the row above */
		padding-bottom: calc(0.25rem + 1px);
	}

	/* The outer columns sit on the content edges, so their text and buttons line up with the headings, header buttons and bars */
	th:first-child,
	td:first-child {
		padding-left: 0;
	}

	th:last-child,
	td:last-child {
		padding-right: 0;
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

	/* Right-aligned, so the digits of the counts line up */
	.plays {
		width: 7ch;
		text-align: right;
	}

	/* max-width: 0 stops a long title from widening the table, so it truncates instead of pushing out the actions */
	td.show {
		max-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
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

	.buttons {
		justify-content: flex-end;
		align-items: center;
	}

	/* Opacity rather than visibility, so the button stays reachable by keyboard */
	/* Flex, so the wrapper is no taller than the button and it lines up with the other actions */
	.reveal {
		display: flex;
		opacity: 0;
	}

	tr:hover .reveal,
	.reveal:focus-within {
		opacity: 1;
	}

	.subtitle {
		color: var(--muted);
	}

	.badge {
		color: var(--accent);
	}

	/* Only a colour change: the buttons draw their outlines and icons in the text colour */
	.failed,
	.failed .subtitle {
		color: var(--accent);
	}
</style>
