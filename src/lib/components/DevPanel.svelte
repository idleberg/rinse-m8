<script lang="ts">
	import { confirm } from '#lib/confirm.svelte';
	import { downloads } from '#lib/downloads.svelte';
	import { errors } from '#lib/errors.svelte';
	import { player } from '#lib/player.svelte';
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
		<label>
			<input type="checkbox" checked={downloads.faked} onchange={(event) => downloads.fake(event.currentTarget.checked)} />
			Fake download
		</label>
		<div class="buttons">
			<button type="button" onclick={() => player.fake(true)}>Load episode</button>
			<button type="button" onclick={() => player.fake(false)}>Clear</button>
		</div>
		<button type="button" onclick={() => errors.report('Sample error: something went wrong')}>Set error</button>
		<!-- Through the real event, which the errors module turns into its offline message -->
		<button type="button" onclick={() => window.dispatchEvent(new Event('offline'))}>Set offline</button>
		<button type="button" onclick={() => confirm({ title: 'Sample Question', message: 'Answer the sample question?', action: 'Answer' })}>Show dialog</button>
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

	/* One per line, under the checkboxes, apart from the player's Load and Clear pair */
	aside > button,
	.buttons {
		margin-top: 0.5rem;
	}

	aside > button {
		display: block;
	}
</style>
