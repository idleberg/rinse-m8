<script lang="ts">
	import type { DownloadQueue, Episode } from './episodes';

	let {
		episode,
		downloads,
		ondownload,
	}: {
		episode: Episode;
		downloads: DownloadQueue;
		ondownload: (episode: Episode) => void;
	} = $props();

	const downloading = $derived(downloads.current?.id === episode.id);
	const queued = $derived(downloads.waiting.some((e) => e.id === episode.id));
	const failed = $derived(downloads.failed?.id === episode.id);

	/** Replaces the button while the episode is in the queue. */
	const status = $derived.by(() => {
		if (downloading) {
			return downloads.percent === null ? 'Downloading…' : `${downloads.percent}%`;
		}

		return queued ? 'Queued' : null;
	});
</script>

{#if status}
	<span>{status}</span>
{:else if failed}
	<button onclick={() => ondownload(episode)}>Failed</button>
{:else}
	<button class="icon" aria-label="Download" title="Download" onclick={() => ondownload(episode)}>
		<svg viewBox="0 0 16 16" aria-hidden="true">
			<path d="M8 2v11M3 8l5 5 5-5" />
		</svg>
	</button>
{/if}
