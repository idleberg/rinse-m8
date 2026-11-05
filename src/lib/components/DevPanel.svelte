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
		<h2>Dev Tools</h2>
		<label>
			<input type="checkbox" checked={updates.faked} onchange={(event) => updates.fake(event.currentTarget.checked)} />
			Fake update
		</label>
		<label>
			<input type="checkbox" checked={downloads.faked} onchange={(event) => downloads.fake(event.currentTarget.checked)} />
			Fake download
		</label>
		<div class="buttons">
			<button type="button" onclick={player.fake}>Load episode</button>
			<button type="button" onclick={player.reset}>Clear</button>
		</div>
		<button type="button" onclick={() => errors.report('Sample error: something went wrong')}>Set error</button>
		<!-- Through the real event, which the errors module turns into its offline message -->
		<button type="button" onclick={() => window.dispatchEvent(new Event('offline'))}>Set offline</button>
		<button type="button" onclick={() => confirm({ title: 'Sample Question', message: 'Answer the sample question?', primaryAction: 'Answer', secondaryAction: 'Cancel' })}>Show dialog</button>
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
		padding: 0 1rem 1rem;
		background: color-mix(in srgb, var(--paper), var(--ink) 10%);
		overflow-y: auto;
	}

	/* As tall as the nav, so it lines up with the tabs */
	h2 {
		display: flex;
		align-items: center;
		height: 40px;
		margin: 0 0 0.5rem;
		font-size: inherit;
		text-transform: uppercase;
	}

	label {
		display: block;
		cursor: pointer;
	}

	/* Room for the checkbox's focus outline, which reaches 4px past the box */
	label + label {
		margin-top: 0.5rem;
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
