<script lang="ts">
	let { subscribed, disabled, onclick }: { subscribed: boolean; disabled: boolean; onclick: () => void } = $props();
</script>

<!-- The toggle's state is in `aria-pressed`, so only the hover text names the action -->
<button type="button" class="icon" aria-label="Subscribe" title={subscribed ? 'Unsubscribe' : 'Subscribe'} aria-pressed={subscribed} {disabled} {onclick}>
	<svg viewBox="0 0 16 16" aria-hidden="true">
		<path d={subscribed ? 'M3 8h10' : 'M3 8h10M8 3v10'} />
	</svg>
</button>
