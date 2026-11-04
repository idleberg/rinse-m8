<script lang="ts">
	import { downloads } from '#lib/downloads.svelte';
	import type { Episode } from '#lib/episodes';

	let {
		episode,
		markable = false,
	}: {
		episode: Episode;
		/** Adds a button that records the episode as downloaded without downloading it. */
		markable?: boolean;
	} = $props();

	const downloading = $derived(downloads.queue.current?.id === episode.id);
	const queued = $derived(downloads.queue.waiting.some((e) => e.id === episode.id));
	const failed = $derived(downloads.queue.failures.some((e) => e.id === episode.id));
	const downloaded = $derived(downloads.queue.downloaded.includes(episode.id));
	const label = $derived(failed ? 'Retry' : downloaded ? 'Downloaded, download again' : 'Download');
</script>

<!-- A downloaded episode can be downloaded again, e.g. after its file was deleted; a failed one is retried -->
<!-- Disabled while the episode is in the queue; the progress is in the footer -->
<button type="button"
	class="icon"
	aria-label={label}
	title={label}
	disabled={downloading || queued}
	onclick={() => downloads.download(episode)}
>
	<svg viewBox="0 0 16 16" aria-hidden="true">
		<path d={downloaded ? 'M3 8l3.5 3.5L13 4' : 'M8 2v11M3 8l5 5 5-5'} />
	</svg>
</button>
{#if markable}
	<button type="button"
		class="icon"
		aria-label="Mark as downloaded"
		title="Mark as downloaded"
		disabled={downloaded}
		onclick={() => downloads.mark(episode.id)}
	>
		<svg viewBox="0 0 16 16" aria-hidden="true">
			<path d="M4 4l8 8M12 4l-8 8" />
		</svg>
	</button>
{/if}
