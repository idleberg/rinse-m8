<script lang="ts">
	import Artwork from '#lib/components/Artwork.svelte';
	import PlayerControls from '#lib/components/PlayerControls.svelte';
	import { formatDate } from '#lib/episodes';
	import { player } from '#lib/player.svelte';

	/** Images that failed to load, so the cover falls back past them. */
	let failed = $state<string[]>([]);

	const playable = $derived(player.episode?.mp3 ? player.episode : null);
	const cover = $derived([playable?.image, playable?.showImage].find((src) => src && !failed.includes(src)));

	/** The index of the row being dragged, and of the row it's over. */
	let dragged = $state<number | null>(null);
	let over = $state<number | null>(null);
	let rows: HTMLTableRowElement[] = [];

	/** How many history rows show, growing a page at a time. */
	const historyPage = 20;
	let historyShown = $state(historyPage);

	// The rows are unkeyed, so a moved episode shows in another row's element and focus follows it there
	function moveWithArrows(event: KeyboardEvent, index: number) {
		const step = { ArrowUp: -1, ArrowDown: 1 }[event.key];

		if (!(event.altKey && step)) {
			return;
		}

		event.preventDefault();

		const target = index + step;

		if (target >= 0 && target < player.playQueue.length) {
			player.move(index, target);
			rows[target]?.focus();
		}
	}
</script>

<section>
	<Artwork src={cover} empty={playable ? 'No artwork for this show' : undefined} onerror={() => cover && failed.push(cover)} />
	{#if playable}
		<div class="controls">
			<PlayerControls layout="tab" />
		</div>
	{:else}
		<p class="empty">Nothing playing</p>
	{/if}
</section>

<header>
	<h2>Play Queue</h2>
	{#if player.playQueue.length}
		<button type="button" onclick={player.clearQueue}>Clear Queue</button>
	{/if}
</header>

{#if player.playQueue.length}
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
			{#each player.playQueue as episode, index}
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
							player.move(dragged, index);
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
						<div class="buttons">
							<button type="button" class="icon reveal" aria-label="Play" title="Play" onclick={() => player.playFromQueue(index)}>
								<svg viewBox="0 0 16 16" aria-hidden="true">
									<path d="M4 2.5l9 5.5-9 5.5z" />
								</svg>
							</button>
							<button type="button" class="icon" aria-label="Remove" title="Remove" onclick={() => player.dequeue(index)}>
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

<header>
	<h2>History</h2>
	{#if player.playHistory.length}
		<button type="button" onclick={player.clearHistory}>Clear History</button>
	{/if}
</header>

{#if player.playHistory.length}
	<table>
		<thead>
			<tr>
				<th>Date</th>
				<th>Show</th>
				<th></th>
			</tr>
		</thead>
		<tbody>
			{#each player.playHistory.slice(0, historyShown) as episode (episode.id)}
				<tr>
					<td>{formatDate(episode.date)}</td>
					<td>
						{episode.showTitle}
						{#if episode.displayTitle}
							<span class="subtitle">{episode.displayTitle}</span>
						{/if}
					</td>
					<td>
						<div class="buttons">
							<button type="button" class="icon reveal" aria-label="Play" title="Play" onclick={() => player.play(episode)}>
								<svg viewBox="0 0 16 16" aria-hidden="true">
									<path d="M4 2.5l9 5.5-9 5.5z" />
								</svg>
							</button>
							<button type="button"
								class="icon"
								aria-label="Add to play queue"
								title="Add to play queue"
								onclick={() => player.enqueue(episode)}
							>
								<svg viewBox="0 0 16 16" aria-hidden="true">
									<path d="M2 3.5h12M2 7.5h12M2 11.5h6M10 9.5l4 2.5-4 2.5z" />
								</svg>
							</button>
						</div>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
	{#if player.playHistory.length > historyShown}
		<button type="button" class="more" onclick={() => {
			historyShown += historyPage;
		}}>
			Show more ({player.playHistory.length - historyShown})
		</button>
	{/if}
{:else}
	<p class="empty">Nothing played yet</p>
{/if}

<style>
	section {
		display: flex;
		gap: 1rem;
		align-items: center;
	}

	/* "Nothing playing" takes the controls' place, so it stretches like them */
	.controls,
	.empty {
		flex: 1;
	}

	/* Lets it shrink below the title's width, so a long title scrolls instead of widening it */
	.controls {
		min-width: 0;
	}

	.empty {
		margin: 0;
		text-transform: uppercase;
		color: var(--muted);
	}

	/* The clear button sits on the right edge, as the actions do */
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin: 2rem 0 0.5rem;
	}

	h2 {
		margin: 0;
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

	/* Room for a focused sort button's outline, which sits 4px outside it, so it clears both lines by 3px like a focused button in a row */
	th {
		padding-block: calc(0.25rem + 3px);
		border-bottom: 1px solid currentColor;
		font-weight: 700;
	}

	/* A row of `-` characters, as in the episode tables */
	td {
		background: linear-gradient(to right, var(--muted) 60%, transparent 0) left bottom / 1ch 1px repeat-x;
		/* One more pixel below, since the line sits inside the padding, so a focused button is as far from it as from the row above */
		padding-bottom: calc(0.25rem + 1px);
	}

	td:first-child {
		width: 1%;
		font-variant-numeric: tabular-nums;
	}

	td:last-child {
		width: 1%;
	}

	.buttons {
		justify-content: flex-end;
	}

	/* Opacity rather than visibility, so the button stays reachable by keyboard */
	.reveal {
		opacity: 0;
	}

	tr:hover .reveal,
	tr:focus-within .reveal {
		opacity: 1;
	}

	.subtitle {
		color: var(--muted);
	}

	.more {
		margin-top: 0.5rem;
	}
</style>
