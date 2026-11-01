<script lang="ts">
	let {
		version,
		percent,
		onupdate,
		ondismiss,
	}: {
		version: string;
		/** Null until Update is clicked. */
		percent: number | null;
		onupdate: () => void;
		ondismiss: () => void;
	} = $props();
</script>

<aside role="status">
	<span>Version {version} is available</span>
	{#if percent === null}
		<div>
			<button type="button" onclick={onupdate}>Update</button>
			<button type="button" onclick={ondismiss}>Dismiss</button>
		</div>
	{:else}
		<progress max="100" value={percent} aria-label="Updating"></progress>
		{percent}%
	{/if}
</aside>

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

	div {
		display: flex;
		gap: 0.5ch;
		margin-left: auto;
	}
</style>
