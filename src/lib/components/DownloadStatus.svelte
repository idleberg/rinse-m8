<script lang="ts">
	import { untrack } from 'svelte';
	import { downloads } from '#lib/downloads.svelte';
	import { episodeLabel } from '#lib/episodes';
	import { goto } from '$app/navigation';

	const queue = $derived(downloads.queue);

	/** Downloads started since the queue was last idle, so the count runs on as the queue drains. */
	let started = $state(0);
	let lastId: string | null = null;

	$effect.pre(() => {
		const id = queue.current?.id ?? null;

		if (id === null) {
			started = 0;
		} else if (id !== lastId) {
			started = untrack(() => started) + 1;
		}

		lastId = id;
	});
</script>

{#if queue.current}
	<footer role="status">
		<span>Downloading {started} / {started + queue.waiting.length}…</span>
		<progress max="100" value={queue.percent ?? undefined} aria-label={episodeLabel(queue.current)}></progress>
		{queue.percent === null ? '' : `${queue.percent}%`}
		<div class="buttons">
			<button type="button" class="icon" aria-label="Cancel" title="Cancel" onclick={downloads.cancel}>
				<svg viewBox="0 0 16 16" aria-hidden="true">
					<path d="M4 4l8 8M12 4l-8 8" />
				</svg>
			</button>
			<button type="button" onclick={() => goto('/downloads')}>View queue</button>
		</div>
	</footer>
{:else if queue.failures.length}
	<footer role="alert">
		{queue.failures.length === 1 ? `Failed: ${episodeLabel(queue.failures[0])}` : `${queue.failures.length} downloads failed`}
		<div class="buttons">
			<button type="button" onclick={() => goto('/downloads')}>View queue</button>
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

	/* On the right edge also when a failure has no progress bar to push them there */
	.buttons {
		margin-left: auto;
	}
</style>
