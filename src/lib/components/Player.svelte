<script lang="ts">
	import PlayerControls from '#lib/components/PlayerControls.svelte';
	import { player } from '#lib/player.svelte';
</script>

{#if player.episode?.mp3}
	<footer>
		<PlayerControls />
		<!-- biome-ignore lint/a11y/useMediaCaption: Rinse has no captions for its mixes -->
		<audio
			bind:this={player.audio}
			src={player.episode.mp3}
			bind:paused={player.paused}
			bind:currentTime={player.currentTime}
			bind:duration={player.duration}
			preload="metadata"
			onloadedmetadata={player.handleLoadedMetadata}
			ontimeupdate={player.handleTimeUpdate}
			onseeked={player.handleSeeked}
			onplay={player.handlePlay}
			onpause={player.handlePause}
			onended={player.handleEnded}
			onerror={player.handleError}
		></audio>
	</footer>
{/if}

<style>
	footer {
		border-top: 1px solid currentColor;
		padding: 0.5rem 1rem;
		background: var(--paper);
	}
</style>
