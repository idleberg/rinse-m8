<script lang="ts">
	import { invoke } from '@tauri-apps/api/core';
	import { revealItemInDir } from '@tauri-apps/plugin-opener';
	import { untrack } from 'svelte';
	import DownloadButton from '#lib/components/DownloadButton.svelte';
	import Flyout from '#lib/components/Flyout.svelte';
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
		/** Adds "Mark as downloaded" to each row's flyout. */
		markable?: boolean;
		/** How often each episode has been played, by episode id. When given, the table has a Plays column and starts out
		 * sorted by it. */
		plays?: Record<string, number>;
		/** Adds "Subscribe" to each row's flyout. */
		subscribable?: boolean;
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

	/** The download-folder file of each row that has one, so its download button stays disabled. Fetched only without
	 * `files`, which already says. */
	let found = $state<Record<string, string>>({});

	// Joined, so updates that leave the ids as they were don't refetch
	const foundKey = $derived(files ? '' : `${rows.map((episode) => episode.id).join()}|${downloads.queue.downloaded.join()}`);

	$effect(() => {
		if (!foundKey) {
			found = {};

			return;
		}

		const listed = untrack(() => $state.snapshot(rows));

		invoke<typeof found>('get_downloaded_files', { episodes: listed })
			.then((loaded) => {
				found = loaded;
			})
			.catch(errors.report);
	});
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
			{@const onDisk = episode.id in found}
			<!-- Given `files`, an episode without one has lost its file, so it no longer counts -->
			{@const downloaded = onDisk || (!files && downloads.queue.downloaded.includes(episode.id))}
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
							<DownloadButton {episode} {downloaded} {onDisk} />
						{/if}
						{#if markable || subscribable}
							<Flyout>
								{#if markable}
									<!-- Disabled without an mp3, as it had no download button to sit beside -->
									<button
										type="button"
										role="menuitem"
										disabled={!available(episode) || downloaded}
										onclick={() => downloads.mark(episode.id)}
									>
										Mark as downloaded
									</button>
								{/if}
								{#if subscribable}
									<SubscribeButton show={showOf(episode)} entry />
								{/if}
							</Flyout>
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
