<script lang="ts">
	import { prefersReducedMotion } from 'svelte/motion';
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
		layout = 'bar',
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
		/** The Player tab puts the label on a line of its own, and adds the full length to the time. */
		layout?: 'bar' | 'tab';
	} = $props();

	/** How fast a title too long for its space scrolls, in pixels per second. */
	const scrollSpeed = 25;

	const label = $derived(episode ? episodeLabel(episode) : '');

	let box: HTMLElement | undefined = $state();
	let text: HTMLElement | undefined = $state();
	let trackElement: HTMLElement | undefined = $state();
	let overflows = $state(false);
	let scrollDuration = $state(0);
	/** Whether the listener clicked a scrolling title to stop it, so it reads from the start. */
	let stopped = $state(false);
	const scrollable = $derived(overflows && !prefersReducedMotion.current);
	const scrolling = $derived(scrollable && !stopped);

	$effect(() => {
		if (!(box && text && trackElement)) {
			return;
		}

		const observer = new ResizeObserver(() => {
			if (!(box && text && trackElement)) {
				return;
			}

			overflows = text.scrollWidth > box.clientWidth;

			// The track holds two passes, so one pass is half of it
			scrollDuration = trackElement.scrollWidth / 2 / scrollSpeed;
		});

		observer.observe(box);
		observer.observe(trackElement);

		return () => observer.disconnect();
	});

	function toggleScrolling() {
		stopped = !stopped;
	}
</script>

<!-- Scrolls when it doesn't fit, with a copy after it so the end runs into the start -->
{#snippet track()}
	<div class="track" class:scrolling style:--duration="{scrollDuration}s" bind:this={trackElement}>
		<span class="text" bind:this={text}>{label}</span>
		{#if scrolling}
			<span class="dot" aria-hidden="true">&nbsp;•&nbsp;</span>
			<span aria-hidden="true">{label}</span>
			<span class="dot" aria-hidden="true">&nbsp;•&nbsp;</span>
		{/if}
	</div>
{/snippet}

<!-- A title that doesn't fit is a button, which stops or restarts the scrolling. Keyed, so a new label measures again. -->
{#snippet title()}
	{#key label}
		{#if scrollable}
			<button type="button" class="title" title={stopped ? 'Scroll title' : 'Stop scrolling'} bind:this={box} onclick={toggleScrolling}>
				{@render track()}
			</button>
		{:else}
			<div class="title" bind:this={box}>
				{@render track()}
			</div>
		{/if}
	{/key}
{/snippet}

<div class="row">
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
	{#if layout === 'bar'}
		{@render title()}
	{/if}
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
			: formatTime(currentTime)}{#if layout === 'tab'}{` / ${formatTime(duration || 0)}`}{/if}</button
	>
</div>

{#if layout === 'tab'}
	<div class="label">
		{@render title()}
	</div>
{/if}

<style>
	.row {
		display: flex;
		gap: 1rem;
		align-items: center;
	}

	.row,
	.label {
		text-transform: uppercase;
	}

	.label {
		margin-top: 0.5rem;
	}

	.title {
		display: block;
		overflow: hidden;
		white-space: nowrap;
	}

	/* Reads as plain text, like the time */
	button.title {
		width: 100%;
		border: none;
		padding: 0;
		text-align: inherit;
	}

	/* Capped, so the seek bar keeps most of the row */
	.row .title {
		flex: 0 1 auto;
		min-width: 0;
		max-width: 40%;
	}

	.track {
		display: flex;
	}

	/* Shrinks to the box when still, so the ellipsis shows */
	.text {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.scrolling {
		width: max-content;
		animation: scroll var(--duration) linear infinite;
	}

	.scrolling .text {
		flex-shrink: 0;
	}

	.dot {
		font-weight: bold;
		color: var(--accent);
	}

	@keyframes scroll {
		to {
			transform: translateX(-50%);
		}
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

	/* A thin outlined bar, filled up to the playhead. The row centres it, so it sits where the taller bar did. */
	input {
		flex: 1;
		appearance: none;
		box-sizing: border-box;
		height: 0.5em;
		margin: 0;
		border: 1px solid currentColor;
		background: linear-gradient(var(--accent), var(--accent)) 0 0 / calc(var(--progress) * 100%) 100% no-repeat;
		cursor: pointer;
	}

	input:disabled {
		color: var(--muted);
		cursor: default;
	}

	input::-webkit-slider-thumb {
		appearance: none;
		width: 2px;
		height: calc(0.5em - 2px);
		background: var(--ink);
	}
</style>
