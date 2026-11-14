<script lang="ts">
	import Artwork from '#lib/components/Artwork.svelte';
	import Flyout from '#lib/components/Flyout.svelte';
	import PlayerControls from '#lib/components/PlayerControls.svelte';
	import Recommendations from '#lib/components/Recommendations.svelte';
	import SubscribeButton from '#lib/components/SubscribeButton.svelte';
	import { type Episode, formatDate, showOf } from '#lib/episodes';
	import { refocusTrigger } from '#lib/flyout';
	import { openShow } from '#lib/navigation';
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

	let queueBody = $state<HTMLTableSectionElement>();
	let historyBody = $state<HTMLTableSectionElement>();

	async function removeFromQueue(episode: Episode, index: number) {
		await player.removeFromQueue(episode);
		await refocusTrigger(queueBody, index, '.remove');
	}

	async function removeFromHistory(episode: Episode, index: number) {
		await player.removeFromHistory(episode);
		await refocusTrigger(historyBody, index, '.remove');
	}

	// The rows are unkeyed, so a moved episode shows in another row's element and focus follows it there
	function moveWithArrows(event: KeyboardEvent, index: number) {
		const step = { ArrowUp: -1, ArrowDown: 1 }[event.key];

		// The flyout sits inside the row, and its arrow keys move between entries
		if (!(event.altKey && step) || (event.target as Element).closest('[role="menu"]')) {
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

{#snippet love(episode: Episode)}
	{@const loved = player.lovedIds.includes(episode.id)}
	<button type="button" role="menuitemcheckbox" aria-checked={loved} onclick={() => player.toggleLove(episode)}>
		{loved ? 'Unlove' : 'Love'}
	</button>
{/snippet}

{#snippet remove(label: string, onclick: () => void)}
	<button type="button" class="icon remove" aria-label={label} title={label} {onclick}>
		<svg viewBox="0 0 16 16" aria-hidden="true">
			<path d="M4 4l8 8M12 4l-8 8" />
		</svg>
	</button>
{/snippet}

<section class:idle={!playable}>
	<Artwork src={cover} empty={playable ? 'No artwork for this show' : '•︵•'} onerror={() => cover && failed.push(cover)} />
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
		<tbody bind:this={queueBody}>
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
						// A press in the open flyout, which light dismiss leaves open, would drag its row
						if (event.currentTarget.querySelector(':popover-open')) {
							event.preventDefault();

							return;
						}

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
						<button type="button" class="plain link" onclick={() => openShow(episode.showSlug)}>{episode.showTitle}</button>
						{#if episode.displayTitle}
							<span class="subtitle">{episode.displayTitle}</span>
						{/if}
					</td>
					<td>
						<div class="buttons">
							<button type="button" class="icon" aria-label="Play" title="Play" onclick={() => player.playFromQueue(index)}>
								<svg viewBox="0 0 16 16" aria-hidden="true">
									<path d="M4 2.5l9 5.5-9 5.5z" />
								</svg>
							</button>
							{@render remove('Remove from queue', () => removeFromQueue(episode, index))}
							<Flyout {episode}>
								<SubscribeButton show={showOf(episode)} entry />
								{@render love(episode)}
							</Flyout>
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
		<tbody bind:this={historyBody}>
			{#each player.playHistory.slice(0, historyShown) as episode, index (episode.id)}
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
							<button type="button" class="icon" aria-label="Play" title="Play" onclick={() => player.playOrQueue(episode)}>
								<svg viewBox="0 0 16 16" aria-hidden="true">
									<path d="M4 2.5l9 5.5-9 5.5z" />
								</svg>
							</button>
							{@render remove('Remove from history', () => removeFromHistory(episode, index))}
							<Flyout {episode}>
								<SubscribeButton show={showOf(episode)} entry />
								{@render love(episode)}
							</Flyout>
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

<!-- Something to queue next, for fans of what's playing -->
<Recommendations artist={player.episode?.showTitle ?? null}>
	<header>
		<h2>Recommended shows</h2>
	</header>
</Recommendations>

<style>
	section {
		display: flex;
		gap: 1rem;
		align-items: center;
	}

	/* The emoticon on the empty square */
	.idle :global(.artwork p) {
		font-size: 1.5rem;
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

	.more {
		margin-top: 0.5rem;
	}
</style>
