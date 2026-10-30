<script lang="ts">
	import { type DownloadQueue, episodeLabel } from './episodes';

	let { downloads, ondismiss }: { downloads: DownloadQueue; ondismiss: () => void } = $props();
</script>

{#if downloads.current}
	<footer role="status">
		{episodeLabel(downloads.current)}
		{downloads.percent === null ? '' : `${downloads.percent}%`}
		{#if downloads.waiting.length}
			· {downloads.waiting.length} queued
		{/if}
	</footer>
{:else if downloads.failed}
	<footer role="alert">
		Failed: {episodeLabel(downloads.failed)}
		<button onclick={ondismiss}>Dismiss</button>
	</footer>
{/if}

<style>
	footer {
		position: sticky;
		bottom: 0;
		display: flex;
		gap: 0.5rem;
		align-items: center;
		border-top: 1px solid currentColor;
		padding: 0.5rem 1rem;
		background: var(--paper);
	}
</style>
