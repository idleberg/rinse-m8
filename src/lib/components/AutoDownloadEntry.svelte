<script lang="ts">
	import type { Show } from '#lib/episodes';
	import { settings } from '#lib/settings.svelte';

	/** A flyout entry that enables or disables the show's auto-download. */
	let { show }: { show: Show } = $props();

	const enabled = $derived(settings.stored.autoDownloadShows.includes(show.slug));
	const blocked = $derived(settings.autoDownloadBlocked(show.slug));
</script>

<!-- The hover text says why it's disabled -->
<button
	type="button"
	role="menuitemcheckbox"
	aria-checked={enabled}
	title={blocked}
	disabled={Boolean(blocked)}
	onclick={() => settings.setAutoDownload(show.slug, !enabled)}
>
	{enabled ? 'Disable auto-download' : 'Enable auto-download'}
</button>
