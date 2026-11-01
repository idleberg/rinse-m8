<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import { type Episode, formatDate } from './episodes';
	import PlayerControls from './PlayerControls.svelte';

	let {
		controls,
		queue,
		onplay,
		onremove,
		onmove,
	}: {
		/** The player's own, so this tab and the bottom bar show and change the same playback. */
		controls: ComponentProps<typeof PlayerControls>;
		/** Listed below the controls, in play order. */
		queue: Episode[];
		/** Takes a queue index, and plays that row's episode. */
		onplay: (index: number) => void;
		/** Takes a queue index out of the queue without playing it. */
		onremove: (index: number) => void;
		/** Takes a queue index and the index to move that row's episode to. */
		onmove: (from: number, to: number) => void;
	} = $props();

	/** Images that failed to load, so the cover falls back past them. */
	let failed = $state<string[]>([]);

	const playable = $derived(controls.episode?.mp3 ? controls.episode : null);
	const cover = $derived([playable?.image, playable?.showImage].find((src) => src && !failed.includes(src)));

	/** The index of the row being dragged, and of the row it's over. */
	let dragged = $state<number | null>(null);
	let over = $state<number | null>(null);
	let rows: HTMLTableRowElement[] = [];

	// The rows are unkeyed, so a moved episode shows in another row's element and focus follows it there
	function moveWithArrows(event: KeyboardEvent, index: number) {
		const step = { ArrowUp: -1, ArrowDown: 1 }[event.key];

		if (!(event.altKey && step)) {
			return;
		}

		event.preventDefault();

		const target = index + step;

		if (target >= 0 && target < queue.length) {
			onmove(index, target);
			rows[target]?.focus();
		}
	}
</script>

<section>
	<div class="cover">
		{#if cover}
			<!-- biome-ignore lint/a11y/noNoninteractiveElementInteractions: a load error, not an interaction -->
			<img src={cover} alt="" onerror={() => failed.push(cover)} />
		{:else if playable}
			<p>No artwork for this show</p>
		{/if}
	</div>
	{#if playable}
		<div class="controls">
			<PlayerControls {...controls} />
		</div>
	{:else}
		<p class="empty">Nothing playing</p>
	{/if}
</section>

<h2>Play Queue</h2>

{#if queue.length}
	<table>
		<thead>
			<tr>
				<th>Date</th>
				<th>Show</th>
				<th></th>
			</tr>
		</thead>
		<tbody>
			<!-- Unkeyed, since an episode can be queued more than once -->
			{#each queue as episode, index}
				<tr
					bind:this={rows[index]}
					class={{
						dragging: dragged === index,
						'drop-above': dragged !== null && over === index && dragged > index,
						'drop-below': dragged !== null && over === index && dragged < index,
					}}
					draggable="true"
					tabindex="0"
					aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
					ondragstart={(event) => {
						dragged = index;
						event.dataTransfer?.setData('text/plain', String(index));
					}}
					ondragend={() => {
						dragged = null;
						over = null;
					}}
					ondragover={(event) => {
						if (dragged !== null) {
							event.preventDefault();
							over = index;
						}
					}}
					ondrop={(event) => {
						event.preventDefault();

						if (dragged !== null) {
							onmove(dragged, index);
						}
					}}
					onkeydown={(event) => moveWithArrows(event, index)}
				>
					<td>{formatDate(episode.date)}</td>
					<td>
						{episode.showTitle}
						{#if episode.displayTitle}
							<span class="subtitle">{episode.displayTitle}</span>
						{/if}
					</td>
					<td>
						<div class="actions">
							<button type="button" class="icon" aria-label="Play" title="Play" onclick={() => onplay(index)}>
								<svg viewBox="0 0 16 16" aria-hidden="true">
									<path d="M4 2.5l9 5.5-9 5.5z" />
								</svg>
							</button>
							<button type="button" class="icon" aria-label="Remove" title="Remove" onclick={() => onremove(index)}>
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
	<p class="empty">The play queue is empty</p>
{/if}

<style>
	section {
		display: flex;
		gap: 1rem;
		align-items: center;
	}

	.cover {
		position: relative;
		display: grid;
		place-items: center;
		flex: none;
		width: min(20rem, 50%);
		aspect-ratio: 1;
		background: black;
		color: white;
		text-transform: uppercase;
		text-align: center;
	}

	/* Laid over the square, so its size can't stretch the grid */
	img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.cover p {
		margin: 0;
		padding: 1rem;
	}

	/* "Nothing playing" takes the controls' place, so it stretches like them */
	.controls,
	.empty {
		flex: 1;
	}

	.empty {
		margin: 0;
		text-transform: uppercase;
		color: var(--muted);
	}

	h2 {
		margin: 2rem 0 0.5rem;
		font-size: 1.25rem;
		text-transform: uppercase;
	}

	/* The table styles follow the queue view's */
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

	td:first-child {
		width: 1%;
		font-variant-numeric: tabular-nums;
	}

	td:last-child {
		width: 1%;
	}

	.actions {
		display: flex;
		gap: 0.5ch;
		justify-content: flex-end;
	}

	.subtitle {
		color: var(--muted);
	}
</style>
