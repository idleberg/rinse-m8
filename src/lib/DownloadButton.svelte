<script lang="ts">
	import type { DownloadQueue, Episode } from './episodes';

	let {
		episode,
		downloads,
		ondownload,
		onmark,
	}: {
		episode: Episode;
		downloads: DownloadQueue;
		ondownload: (episode: Episode) => void;
		/** Adds a button that records the episode as downloaded without downloading it. */
		onmark?: (episode: Episode) => void;
	} = $props();

	const downloading = $derived(downloads.current?.id === episode.id);
	const queued = $derived(downloads.waiting.some((e) => e.id === episode.id));
	const failed = $derived(downloads.failed?.id === episode.id);
	const downloaded = $derived(downloads.downloaded.includes(episode.id));
	const label = $derived(downloaded ? 'Downloaded, download again' : 'Download');

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
	<button type="button" onclick={() => ondownload(episode)}>Failed</button>
{:else}
	<!-- A downloaded episode can be downloaded again, e.g. after its file was deleted -->
	<button type="button" class="icon" aria-label={label} title={label} onclick={() => ondownload(episode)}>
		<svg viewBox="0 0 16 16" aria-hidden="true">
			<path d={downloaded ? 'M3 8l3.5 3.5L13 4' : 'M8 2v11M3 8l5 5 5-5'} />
		</svg>
	</button>
	{#if onmark}
		<button type="button"
			class="icon"
			aria-label="Mark as downloaded"
			title="Mark as downloaded"
			disabled={downloaded}
			onclick={() => onmark(episode)}
		>
			<svg viewBox="0 0 16 16" aria-hidden="true">
				<path d="M4 4l8 8M12 4l-8 8" />
			</svg>
		</button>
	{/if}
{/if}
