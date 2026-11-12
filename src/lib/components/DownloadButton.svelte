<script lang="ts">
	import { downloads } from '#lib/downloads.svelte';
	import type { Episode } from '#lib/episodes';

	let {
		episode,
		fileMissing = false,
		onDisk = false,
	}: {
		episode: Episode;
		/** Whether the episode's file is known to be gone from the download folder, so it shows as not downloaded. */
		fileMissing?: boolean;
		/** Whether the episode's file is in the download folder, so it isn't downloaded again. */
		onDisk?: boolean;
	} = $props();

	const downloading = $derived(downloads.queue.current?.id === episode.id);
	const queued = $derived(downloads.queue.waiting.some((e) => e.id === episode.id));
	const failed = $derived(downloads.queue.failures.some((e) => e.id === episode.id));
	const downloaded = $derived(onDisk || (!fileMissing && downloads.queue.downloaded.includes(episode.id)));
	const label = $derived(
		failed ? 'Retry' : onDisk ? 'Downloaded' : downloaded ? 'Downloaded, download again' : 'Download',
	);
</script>

<!-- A downloaded episode can be downloaded again once its file is gone; a failed one is retried -->
<!-- Disabled while the episode is in the queue, whose progress is in the footer, or its file is on disk -->
<button type="button"
	class="icon"
	aria-label={label}
	title={label}
	disabled={downloading || queued || onDisk}
	onclick={() => downloads.download(episode)}
>
	<svg viewBox="0 0 16 16" aria-hidden="true">
		<!-- A check only where the button is disabled; a recorded download whose file is gone gets a circular arrow -->
		{#if onDisk}
			<path d="M3 8l3.5 3.5L13 4" />
		{:else if downloaded}
			<path d="M13.5 8A5.5 5.5 0 1 1 11.9 4.1M11.9 1.5v2.6H9.3" />
		{:else}
			<path d="M8 2v11M3 8l5 5 5-5" />
		{/if}
	</svg>
</button>
