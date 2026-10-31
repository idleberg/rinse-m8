<script lang="ts">
	import { untrack } from 'svelte';
	import { type DownloadQueue, type Episode, episodeLabel } from './episodes';

	let {
		downloads,
		oncancel,
		onretry,
		ondismiss,
		onviewqueue,
	}: {
		downloads: DownloadQueue;
		/** Stops the running download; the next waiting one starts. */
		oncancel: () => void;
		/** Takes the failed episode. */
		onretry: (episode: Episode) => void;
		ondismiss: () => void;
		onviewqueue: () => void;
	} = $props();

	/** Downloads started since the queue was last idle, so the count runs on as the queue drains. */
	let started = $state(0);
	let lastId: string | null = null;

	$effect.pre(() => {
		const id = downloads.current?.id ?? null;

		if (id === null) {
			started = 0;
		} else if (id !== lastId) {
			started = untrack(() => started) + 1;
		}

		lastId = id;
	});
</script>

{#if downloads.current}
	<footer role="status">
		<span>Downloading {started} / {started + downloads.waiting.length}…</span>
		<progress max="100" value={downloads.percent ?? undefined} aria-label={episodeLabel(downloads.current)}></progress>
		{downloads.percent === null ? '' : `${downloads.percent}%`}
		<div>
			<button type="button" class="icon" aria-label="Cancel" title="Cancel" onclick={oncancel}>
				<svg viewBox="0 0 16 16" aria-hidden="true">
					<path d="M4 4l8 8M12 4l-8 8" />
				</svg>
			</button>
			<button type="button" onclick={onviewqueue}>View queue</button>
		</div>
	</footer>
{:else if downloads.failed}
	<footer role="alert">
		Failed: {episodeLabel(downloads.failed)}
		<div>
			<button type="button" onclick={() => downloads.failed && onretry(downloads.failed)}>Retry</button>
			<button type="button" onclick={ondismiss}>Dismiss</button>
			<button type="button" onclick={onviewqueue}>View queue</button>
		</div>
	</footer>
{/if}

<style>
	footer {
		display: flex;
		gap: 1rem;
		align-items: center;
		border-top: 1px solid currentColor;
		padding: 0.5rem 1rem;
		background: var(--paper);
		text-transform: uppercase;
		font-variant-numeric: tabular-nums;
	}

	/* Stretches like the player's seek bar */
	progress {
		flex: 1;
	}

	/* Spaced like the episode table's buttons, on the right edge also when a failure has no progress bar to push them there */
	div {
		display: flex;
		gap: 0.5ch;
		margin-left: auto;
	}
</style>
