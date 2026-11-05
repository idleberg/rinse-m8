<!-- PROTOTYPE, throw away: switches the dithering variants. Mounted only in dev builds. -->
<script lang="ts">
	import { proto, variantName, variants } from '#lib/dither-prototype.svelte';

	const step = (by: number) => {
		proto.variant = (proto.variant + by + variants.length) % variants.length;
	};
</script>

<svelte:window
	onkeydown={(event) => {
		const target = event.target as HTMLElement;

		if (target.closest('input, textarea, [contenteditable], [role="row"], tr')) return;
		if (event.key === 'ArrowLeft') step(-1);
		if (event.key === 'ArrowRight') step(1);
	}}
/>

<div class="switcher">
	<button type="button" aria-label="Previous variant" onclick={() => step(-1)}>←</button>
	<span>{proto.variant} · {variantName(proto.variant)}</span>
	<button type="button" aria-label="Next variant" onclick={() => step(1)}>→</button>
</div>

<style>
	.switcher {
		position: fixed;
		bottom: 64px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 10;
		display: flex;
		gap: 0.75rem;
		align-items: center;
		padding: 0.25rem 0.5rem;
		border-radius: 999px;
		background: #ff00aa;
		color: white;
		font: 12px/1.4 system-ui, sans-serif;
		box-shadow: 0 2px 12px rgb(0 0 0 / 0.35);
	}

	button {
		border: none;
		background: none;
		color: inherit;
		cursor: pointer;
		font-size: 14px;
	}
</style>
