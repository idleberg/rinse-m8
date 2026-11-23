<script lang="ts">
	import { type Theme, theme, themes } from '#lib/theme.svelte';
</script>

<!-- Laid out like the Appearance toggle beside it -->
<fieldset aria-label="Theme">
	{#each Object.entries(themes) as [value, label] (value)}
		<button type="button" aria-pressed={theme.current === value} onclick={() => theme.pick(value as Theme)}>{label}</button>
	{/each}
</fieldset>

<style>
	fieldset {
		display: flex;
		margin: 0;
		border: none;
		padding: 0;
	}

	button + button {
		border-left: none;
	}
</style>
