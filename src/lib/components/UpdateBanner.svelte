<script lang="ts">
	import { updates } from '#lib/updates.svelte';
</script>

{#if updates.available}
	<aside role="status">
		<span>Version {updates.available.version} is available</span>
		{#if updates.available.percent === null}
			<div class="buttons">
				<button type="button" onclick={updates.install}>Update</button>
				<button type="button" onclick={updates.dismiss}>Dismiss</button>
			</div>
		{:else}
			<progress max="100" value={updates.available.percent} aria-label="Updating"></progress>
			{updates.available.percent}%
		{/if}
	</aside>
{/if}

<style>
	/* Laid out like the download status bar */
	aside {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		align-items: center;
		padding: 0.5rem 1rem;
		background: var(--info);
		color: white;
		text-transform: uppercase;
		font-variant-numeric: tabular-nums;
	}

	progress {
		flex: 1;
	}

	/* The global fill is ink, which would vanish on blue in the dark theme */
	progress::-webkit-progress-value {
		background: currentColor;
	}

	.buttons {
		margin-left: auto;
	}
</style>
