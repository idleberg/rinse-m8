<script lang="ts">
	import { invoke } from '@tauri-apps/api/core';
	import { revealItemInDir } from '@tauri-apps/plugin-opener';
	import { type DownloadQueue, type Episode, formatDate } from './episodes';

	let {
		downloads,
		onremove,
		onmove,
		oncancel,
		ondismiss,
		onerror,
	}: {
		downloads: DownloadQueue;
		/** Takes an episode id. */
		onremove: (id: string) => void;
		/** Takes an episode id and its new index among the waiting downloads. */
		onmove: (id: string, index: number) => void;
		/** Stops the running download. */
		oncancel: () => void;
		ondismiss: () => void;
		onerror: (error: unknown) => void;
	} = $props();

	/** Downloaded and marked episodes, newest first, with the mp3 when it's in the download folder. */
	let previous = $state<(Episode & { file: string | null })[]>([]);

	// Joined, so progress updates that leave the ids as they were don't refetch
	const downloadedKey = $derived(downloads.downloaded.join());

	// Fetched when the view opens and again whenever a download is recorded
	$effect(() => {
		if (!downloadedKey) {
			return;
		}

		invoke<typeof previous>('get_previous_downloads')
			.then((loaded) => {
				previous = loaded;
			})
			.catch(onerror);
	});

	let dragged: string | null = null;
	let rows: Record<string, HTMLTableRowElement> = {};
	/** A keyboard move waiting for the queue to come back, so its row can get focus again. */
	let moved: { id: string; index: number } | null = null;

	// Svelte moves a reordered row's element, which drops its focus
	$effect(() => {
		if (moved && downloads.waiting[moved.index]?.id === moved.id) {
			rows[moved.id]?.focus();
			moved = null;
		}
	});

	function moveWithArrows(event: KeyboardEvent, id: string, index: number) {
		const step = { ArrowUp: -1, ArrowDown: 1 }[event.key];

		if (!(event.altKey && step)) {
			return;
		}

		event.preventDefault();

		const target = index + step;

		if (target >= 0 && target < downloads.waiting.length) {
			moved = { id, index: target };
			onmove(id, target);
		}
	}
</script>

<h2>Active Downloads</h2>

{#if downloads.current || downloads.waiting.length || downloads.failed}
	<table>
		<thead>
			<tr>
				<th>Date</th>
				<th>Show</th>
				<th></th>
				<th></th>
			</tr>
		</thead>
		<tbody>
			{#if downloads.current}
				<tr>
					<td>{formatDate(downloads.current.date)}</td>
					<td>
						{downloads.current.showTitle}
						{#if downloads.current.displayTitle}
							<span class="subtitle">{downloads.current.displayTitle}</span>
						{/if}
					</td>
					<td class="status">{downloads.percent === null ? 'Downloading…' : `${downloads.percent}%`}</td>
					<td>
						<button type="button" class="icon" aria-label="Cancel" title="Cancel" onclick={oncancel}>
							<svg viewBox="0 0 16 16" aria-hidden="true">
								<path d="M4 4l8 8M12 4l-8 8" />
							</svg>
						</button>
					</td>
				</tr>
			{/if}
			{#each downloads.waiting as episode, index (episode.id)}
				<tr
					bind:this={rows[episode.id]}
					draggable="true"
					tabindex="0"
					aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
					ondragstart={(event) => {
						dragged = episode.id;
						event.dataTransfer?.setData('text/plain', episode.id);
					}}
					ondragend={() => {
						dragged = null;
					}}
					ondragover={(event) => dragged && event.preventDefault()}
					ondrop={(event) => {
						event.preventDefault();

						if (dragged) {
							onmove(dragged, index);
						}
					}}
					onkeydown={(event) => moveWithArrows(event, episode.id, index)}
				>
					<td>{formatDate(episode.date)}</td>
					<td>
						{episode.showTitle}
						{#if episode.displayTitle}
							<span class="subtitle">{episode.displayTitle}</span>
						{/if}
					</td>
					<td></td>
					<td><button type="button" onclick={() => onremove(episode.id)}>Remove</button></td>
				</tr>
			{/each}
			{#if downloads.failed}
				<tr class="failed">
					<td>{formatDate(downloads.failed.date)}</td>
					<td>
						{downloads.failed.showTitle}
						{#if downloads.failed.displayTitle}
							<span class="subtitle">{downloads.failed.displayTitle}</span>
						{/if}
					</td>
					<td class="status">Failed</td>
					<td><button type="button" onclick={ondismiss}>Dismiss</button></td>
				</tr>
			{/if}
		</tbody>
	</table>
{:else}
	<p>The download queue is empty</p>
{/if}

<h2>Previous Downloads</h2>

{#if previous.length}
	<table>
		<thead>
			<tr>
				<th>Date</th>
				<th>Show</th>
				<th></th>
			</tr>
		</thead>
		<tbody>
			{#each previous as episode (episode.id)}
				<tr>
					<td>{formatDate(episode.date)}</td>
					<td>
						{episode.showTitle}
						{#if episode.displayTitle}
							<span class="subtitle">{episode.displayTitle}</span>
						{/if}
					</td>
					<td>
						{#if episode.file}
							{@const file = episode.file}
							<button type="button"
								class="icon"
								aria-label="Show in folder"
								title="Show in folder"
								onclick={() => revealItemInDir(file).catch(onerror)}
							>
								<svg viewBox="0 0 16 16" aria-hidden="true">
									<circle cx="7" cy="7" r="4.5" />
									<path d="M10.5 10.5L14 14" />
								</svg>
							</button>
						{/if}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
{:else}
	<p>No previous downloads</p>
{/if}

<style>
	h2 {
		margin: 0 0 0.5rem;
		font-size: 1.25rem;
		text-transform: uppercase;
	}

	/* Spaces the sections like the dashboard's */
	table + h2,
	p + h2 {
		margin-top: 2rem;
	}

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

	/* A row of `-` characters, as in the episode tables */
	td {
		background: linear-gradient(to right, var(--muted) 60%, transparent 0) left bottom / 1ch 1px repeat-x;
	}

	/* Dates are all `YYYY/MM/DD`, so shrinking to them starts Show at the same x in both tables */
	td:first-child {
		width: 1%;
		font-variant-numeric: tabular-nums;
	}

	/* Actions line up on the right edge in both tables */
	td:last-child {
		width: 1%;
		text-align: right;
	}

	/* Leaves the spare width to Show, as in the previous downloads */
	.status {
		width: 1%;
		text-align: right;
	}

	[draggable='true'] {
		cursor: grab;
	}

	.failed {
		color: var(--accent);
	}

	p {
		text-transform: uppercase;
		color: var(--muted);
	}

	.subtitle {
		color: var(--muted);
	}
</style>
