<script lang="ts">
	import { type Episode, episodeLabel } from './episodes';
	import { formatTime } from './listen';

	let {
		episode,
		paused,
		currentTime,
		duration,
		showRemaining,
		onplay,
		onpause,
		onseek,
		ontoggletime,
	}: {
		/** Null until an episode is loaded, which leaves the label empty. */
		episode: Episode | null;
		paused: boolean;
		/** The playhead, in seconds. */
		currentTime: number;
		/** In seconds, 0 until the metadata loads. */
		duration: number;
		/** Whether the time reads as remaining rather than elapsed. */
		showRemaining: boolean;
		onplay: () => void;
		onpause: () => void;
		onseek: (time: number) => void;
		ontoggletime: () => void;
	} = $props();
</script>

<div>
	{#if paused}
		<button type="button" class="icon" aria-label="Play" title="Play" onclick={onplay}>
			<svg viewBox="0 0 16 16" aria-hidden="true">
				<path d="M4 2.5l9 5.5-9 5.5z" />
			</svg>
		</button>
	{:else}
		<button type="button" class="icon" aria-label="Pause" title="Pause" onclick={onpause}>
			<svg viewBox="0 0 16 16" aria-hidden="true">
				<path d="M5 3v10M11 3v10" />
			</svg>
		</button>
	{/if}
	<span>{episode && episodeLabel(episode)}</span>
	<input
		type="range"
		aria-label="Seek"
		min="0"
		max={duration || 0}
		step="any"
		disabled={!duration}
		style:--progress={duration ? currentTime / duration : 0}
		value={currentTime}
		oninput={(e) => onseek(e.currentTarget.valueAsNumber)}
	/>
	<button type="button" class="time" title={showRemaining ? 'Show elapsed time' : 'Show remaining time'} onclick={ontoggletime}
		><span class:hidden={!showRemaining}>-</span>{showRemaining
			? formatTime((duration || 0) - currentTime)
			: formatTime(currentTime)}</button
	>
</div>

<style>
	div {
		display: flex;
		gap: 1rem;
		align-items: center;
		text-transform: uppercase;
	}

	span {
		white-space: nowrap;
	}

	/* Reads as plain text */
	.time {
		border: none;
		padding: 0;
		font-variant-numeric: tabular-nums;
	}

	/* Keeps the minus's width, so toggling to remaining time doesn't resize the seek bar */
	.hidden {
		visibility: hidden;
	}

	/* Drawn like a button, filled up to the playhead */
	input {
		flex: 1;
		appearance: none;
		box-sizing: border-box;
		height: 1.5em;
		margin: 0;
		border: 1px solid currentColor;
		background: linear-gradient(var(--ink), var(--ink)) 0 0 / calc(var(--progress) * 100%) 100% no-repeat;
		cursor: pointer;
	}

	input:disabled {
		color: var(--muted);
		cursor: default;
	}

	input::-webkit-slider-thumb {
		appearance: none;
		width: 2px;
		height: calc(1.5em - 2px);
		background: var(--accent);
	}
</style>
