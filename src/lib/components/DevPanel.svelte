<script lang="ts">
	import { updates } from '#lib/updates.svelte';

	let open = $state(false);
</script>

<svelte:window
	onkeydown={(event) => {
		if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'd') {
			event.preventDefault();
			open = !open;
		}
	}}
/>

{#if open}
	<aside class="dev-panel" aria-label="Developer panel">
		<h2>Dev</h2>
		<label>
			<input type="checkbox" checked={updates.faked} onchange={(event) => updates.fake(event.currentTarget.checked)} />
			Fake update
		</label>
	</aside>
{/if}

<style>
	/* Narrows the app beside the panel, so the bars at the bottom stay uncovered */
	:global(body:has(.dev-panel)) {
		padding-right: 16rem;
	}

	aside {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		z-index: 1;
		box-sizing: border-box;
		width: 16rem;
		border-left: 1px solid var(--ink);
		padding: 1rem;
		background: color-mix(in srgb, var(--paper), var(--ink) 10%);
		overflow-y: auto;
	}

	h2 {
		margin: 0 0 1rem;
		font-size: inherit;
		text-transform: uppercase;
	}

	label {
		display: block;
		cursor: pointer;
	}
</style>
