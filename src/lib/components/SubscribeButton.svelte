<script lang="ts">
	import type { Show } from '#lib/episodes';
	import { settings } from '#lib/settings.svelte';

	let { show }: { show: Show } = $props();

	const subscribed = $derived(settings.subscribed.includes(show.slug));
</script>

<!-- The toggle's state is in `aria-pressed`, so only the hover text names the action -->
<button
	type="button"
	class="icon"
	aria-label="Subscribe"
	title={subscribed ? 'Unsubscribe' : 'Subscribe'}
	aria-pressed={subscribed}
	disabled={settings.subscribing.includes(show.slug)}
	onclick={() => settings.toggle(show)}
>
	<svg viewBox="0 0 16 16" aria-hidden="true">
		<path d={subscribed ? 'M3 8h10' : 'M3 8h10M8 3v10'} />
	</svg>
</button>
