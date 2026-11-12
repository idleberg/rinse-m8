<script lang="ts">
	import { invoke } from '@tauri-apps/api/core';
	import { revealItemInDir } from '@tauri-apps/plugin-opener';
	import Flyout from '#lib/components/Flyout.svelte';
	import { downloads } from '#lib/downloads.svelte';
	import { available, type Episode, formatDate } from '#lib/episodes';
	import { errors } from '#lib/errors.svelte';
	import { openShow } from '#lib/navigation';
	import { player } from '#lib/player.svelte';

	const queue = $derived(downloads.queue);

	/** Downloaded and marked episodes, newest first, with the mp3 when it's in the download folder. */
	let previous = $state<(Episode & { file: string | null })[]>([]);

	// Joined, so progress updates that leave the ids as they were don't refetch
	const downloadedKey = $derived(queue.downloaded.join());

	// Fetched when the view opens and again whenever a download is recorded
	$effect(() => {
		if (!downloadedKey) {
			previous = [];

			return;
		}

		invoke<typeof previous>('get_previous_downloads')
			.then((loaded) => {
				previous = loaded;
			})
			.catch(errors.report);
	});

	/** The row being dragged, and the index of the row it's over. */
	let dragged = $state<{ id: string; index: number } | null>(null);
	let over = $state<number | null>(null);
	let rows: Record<string, HTMLTableRowElement> = {};
	/** A keyboard move waiting for the queue to come back, so its row can get focus again. */
	let moved: { id: string; index: number } | null = null;

	// Svelte moves a reordered row's element, which drops its focus
	$effect(() => {
		if (moved && queue.waiting[moved.index]?.id === moved.id) {
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

		if (target >= 0 && target < queue.waiting.length) {
			moved = { id, index: target };
			downloads.move(id, target);
		}
	}
</script>

<header class="first">
	<h2>Active Downloads</h2>
	{#if queue.failures.length > 1}
		<button type="button" onclick={downloads.retryAll}>Retry All</button>
	{/if}
</header>

{#if queue.current || queue.waiting.length || queue.failures.length}
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
			{#if queue.current}
				<tr>
					<td>{formatDate(queue.current.date)}</td>
					<td>
						<button type="button" class="plain link" onclick={() => queue.current && openShow(queue.current.showSlug)}>{queue.current.showTitle}</button>
						{#if queue.current.displayTitle}
							<span class="subtitle">{queue.current.displayTitle}</span>
						{/if}
					</td>
					<td class="status">{queue.percent === null ? 'Downloading…' : `${queue.percent}%`}</td>
					<td>
						<button type="button" class="icon" aria-label="Cancel" title="Cancel" onclick={downloads.cancel}>
							<svg viewBox="0 0 16 16" aria-hidden="true">
								<path d="M4 4l8 8M12 4l-8 8" />
							</svg>
						</button>
					</td>
				</tr>
			{/if}
			{#each queue.waiting as episode, index (episode.id)}
				<tr
					bind:this={rows[episode.id]}
					class={{
						dragging: dragged?.index === index,
						'drop-above': dragged && over === index && dragged.index > index,
						'drop-below': dragged && over === index && dragged.index < index,
					}}
					draggable="true"
					tabindex="0"
					aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
					ondragstart={(event) => {
						dragged = { id: episode.id, index };
						event.dataTransfer?.setData('text/plain', episode.id);
					}}
					ondragend={() => {
						dragged = null;
						over = null;
					}}
					ondragover={(event) => {
						if (dragged) {
							event.preventDefault();
							over = index;
						}
					}}
					ondrop={(event) => {
						event.preventDefault();

						if (dragged) {
							downloads.move(dragged.id, index);
						}
					}}
					onkeydown={(event) => moveWithArrows(event, episode.id, index)}
				>
					<td>{formatDate(episode.date)}</td>
					<td>
						<button type="button" class="plain link" onclick={() => openShow(episode.showSlug)}>{episode.showTitle}</button>
						{#if episode.displayTitle}
							<span class="subtitle">{episode.displayTitle}</span>
						{/if}
					</td>
					<td></td>
					<td><button type="button" onclick={() => downloads.remove(episode.id)}>Remove</button></td>
				</tr>
			{/each}
			{#each queue.failures as episode (episode.id)}
				<tr class="failed">
					<td>{formatDate(episode.date)}</td>
					<td>
						<button type="button" class="plain link" onclick={() => openShow(episode.showSlug)}>{episode.showTitle}</button>
						{#if episode.displayTitle}
							<span class="subtitle">{episode.displayTitle}</span>
						{/if}
					</td>
					<td class="status">Failed</td>
					<td>
						<div class="buttons">
							<button type="button" onclick={() => downloads.retry(episode.id)}>Retry</button>
							<button type="button"
								class="icon"
								aria-label="Remove"
								title="Remove"
								onclick={() => downloads.remove(episode.id)}
							>
								<svg viewBox="0 0 16 16" aria-hidden="true">
									<path d="M4 4l8 8M12 4l-8 8" />
								</svg>
							</button>
						</div>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
{:else}
	<p>The download queue is empty</p>
{/if}

<header>
	<h2>Previous Downloads</h2>
	{#if previous.length}
		<button type="button" onclick={downloads.clear}>Clear Downloads</button>
	{/if}
</header>

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
			<!-- Without `file`, which would otherwise travel into the play queue and history -->
			{#each previous as { file, ...episode } (episode.id)}
				{@const loved = player.lovedIds.includes(episode.id)}
				<tr>
					<td>{formatDate(episode.date)}</td>
					<td>
						<button type="button" class="plain link" onclick={() => openShow(episode.showSlug)}>{episode.showTitle}</button>
						{#if episode.displayTitle}
							<span class="subtitle">{episode.displayTitle}</span>
						{/if}
					</td>
					<td>
						<div class="buttons">
							{#if file}
								<button type="button"
									class="icon"
									aria-label="Show in folder"
									title="Show in folder"
									onclick={() => revealItemInDir(file).catch(errors.report)}
								>
									<svg viewBox="0 0 16 16" aria-hidden="true">
										<circle cx="7" cy="7" r="4.5" />
										<path d="M10.5 10.5L14 14" />
									</svg>
								</button>
							{/if}
							<button type="button"
								class="icon"
								aria-label="Remove"
								title="Remove"
								onclick={() => downloads.unmark(episode.id)}
							>
								<svg viewBox="0 0 16 16" aria-hidden="true">
									<path d="M4 4l8 8M12 4l-8 8" />
								</svg>
							</button>
							<Flyout>
								<!-- The player plays the downloaded file when there is one -->
								<button
									type="button"
									role="menuitem"
									disabled={!(file || available(episode))}
									onclick={() => player.playOrQueue(episode)}
								>
									Play
								</button>
								<button type="button" role="menuitemcheckbox" aria-checked={loved} onclick={() => player.toggleLove(episode)}>
									{loved ? 'Unlove' : 'Love'}
								</button>
							</Flyout>
						</div>
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

	/* Spaces the sections like the dashboard's, with the clear button on the right edge as the actions are */
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin: 2rem 0 0.5rem;
	}

	header h2 {
		margin: 0;
	}

	/* Active Downloads starts the view, so it keeps the bare heading's spacing */
	.first {
		margin-top: 0;
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

	/* Room for a focused sort button's outline, which sits 4px outside it, so it clears both lines by 3px like a focused button in a row */
	th {
		padding-block: calc(0.25rem + 3px);
		border-bottom: 1px solid currentColor;
		font-weight: 700;
	}

	/* A row of `-` characters, as in the episode tables */
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

	.buttons {
		justify-content: flex-end;
	}

	.failed,
	.failed .subtitle {
		color: var(--accent);
	}

	p {
		text-transform: uppercase;
		color: var(--muted);
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

	.subtitle {
		color: var(--muted);
	}
</style>
