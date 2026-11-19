<script lang="ts">
	import type { Show } from '#lib/episodes';
	import { settings } from '#lib/settings.svelte';

	let {
		show,
		entry = false,
	}: {
		show: Show;
		/** Renders it as flyout entries: checkable menu items whose text names the action, followed by the show's
		 * auto-download. */
		entry?: boolean;
	} = $props();

	const subscribed = $derived(settings.subscribed.includes(show.slug));
	const disabled = $derived(settings.subscribing.includes(show.slug));
	const autoDownload = $derived(settings.stored.autoDownloadShows.includes(show.slug));
	const autoDownloadBlocked = $derived(settings.autoDownloadBlocked(show.slug));
</script>

{#if entry}
	<button
		type="button"
		role="menuitemcheckbox"
		aria-checked={subscribed}
		{disabled}
		onclick={() => settings.toggle(show)}
	>
		{subscribed ? 'Unsubscribe' : 'Subscribe'}
	</button>
	<!-- The hover text says why it's disabled -->
	<button
		type="button"
		role="menuitemcheckbox"
		aria-checked={autoDownload}
		title={autoDownloadBlocked}
		disabled={Boolean(autoDownloadBlocked)}
		onclick={() => settings.setAutoDownload(show.slug, !autoDownload)}
	>
		{autoDownload ? 'Disable auto-download' : 'Enable auto-download'}
	</button>
{:else}
	<!-- The toggle's state is in `aria-pressed`, so only the hover text names the action -->
	<button
		type="button"
		class="icon"
		aria-label="Subscribe"
		title={subscribed ? 'Unsubscribe' : 'Subscribe'}
		aria-pressed={subscribed}
		{disabled}
		onclick={() => settings.toggle(show)}
	>
		<svg viewBox="0 0 16 16" aria-hidden="true">
			<path d={subscribed ? 'M3 8h10' : 'M3 8h10M8 3v10'} />
		</svg>
	</button>
{/if}
