<script lang="ts">
	import type { Show } from '#lib/episodes';
	import { settings } from '#lib/settings.svelte';

	let {
		show,
		entry = false,
	}: {
		show: Show;
		/** Renders it as a flyout entry: a checkable menu item whose text names the action. */
		entry?: boolean;
	} = $props();

	const subscribed = $derived(settings.subscribed.includes(show.slug));
	const disabled = $derived(settings.subscribing.includes(show.slug));
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
