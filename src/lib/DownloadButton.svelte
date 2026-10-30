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

	const label = $derived.by(() => {
		if (downloading) {
			return downloads.percent === null ? 'Downloading…' : `${downloads.percent}%`;
		}

		if (queued) {
			return 'Queued';
		}

		return downloads.failed?.id === episode.id ? 'Failed' : 'Download';
	});
</script>

<button disabled={downloading || queued} onclick={() => ondownload(episode)}>{label}</button>
