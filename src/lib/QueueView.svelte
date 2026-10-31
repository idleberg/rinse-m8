<script lang="ts">
	import { type DownloadQueue, formatDate } from './episodes';

	let {
		downloads,
		onremove,
		onmove,
		oncancel,
		ondismiss,
	}: {
		downloads: DownloadQueue;
		/** Takes an episode id. */
		onremove: (id: string) => void;
		/** Takes an episode id and its new index among the waiting downloads. */
		onmove: (id: string, index: number) => void;
		/** Stops the running download. */
		oncancel: () => void;
		ondismiss: () => void;
	} = $props();

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

		if (!event.altKey || !step) {
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

{#if downloads.current || downloads.waiting.length || downloads.failed}
	<table>
		<thead>
			<tr>
				<th>Date</th>
				<th>Show</th>
				<th>Title</th>
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
							<br />
							<span class="subtitle">{downloads.current.displayTitle}</span>
						{/if}
					</td>
					<td>{downloads.current.title}</td>
					<td>
						<progress max="100" value={downloads.percent ?? undefined}></progress>
						{downloads.percent === null ? 'Downloading…' : `${downloads.percent}%`}
						<button onclick={oncancel}>Cancel</button>
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
					ondragend={() => (dragged = null)}
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
							<br />
							<span class="subtitle">{episode.displayTitle}</span>
						{/if}
					</td>
					<td>{episode.title}</td>
					<td><button onclick={() => onremove(episode.id)}>Remove</button></td>
				</tr>
			{/each}
			{#if downloads.failed}
				<tr class="failed">
					<td>{formatDate(downloads.failed.date)}</td>
					<td>
						{downloads.failed.showTitle}
						{#if downloads.failed.displayTitle}
							<br />
							<span class="subtitle">{downloads.failed.displayTitle}</span>
						{/if}
					</td>
					<td>{downloads.failed.title}</td>
					<td>Failed <button onclick={ondismiss}>Dismiss</button></td>
				</tr>
			{/if}
		</tbody>
	</table>
{:else}
	<p>The download queue is empty</p>
{/if}

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
