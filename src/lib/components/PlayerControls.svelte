<script lang="ts">
	import { on } from 'svelte/events';
	import { prefersReducedMotion } from 'svelte/motion';
	import { episodeLabel, formatDate } from '#lib/episodes';
	import { formatTime, type Repeat } from '#lib/listen';
	import { player } from '#lib/player.svelte';

	let {
		layout = 'bar',
	}: {
		/** The Player tab puts the label on a line of its own, and adds the full length to the time. */
		layout?: 'bar' | 'tab';
	} = $props();

	/** How fast a title too long for its space scrolls, in pixels per second. */
	const scrollSpeed = 25;

	/** How far one mouse-wheel notch seeks, in seconds. */
	const wheelSeek = 5;
	/** The pixel delta of one mouse-wheel notch. */
	const wheelNotch = 100;

	const repeatTitles: Record<Repeat, string> = { off: 'Repeat off', all: 'Repeat all', one: 'Repeat one' };

	/** The Player tab shows the show as a heading, so its label leaves it out. */
	const label = $derived.by(() => {
		const { episode } = player;

		if (!episode) {
			return '';
		}

		return layout === 'tab' ? [episode.displayTitle, formatDate(episode.date)].filter(Boolean).join(' – ') : episodeLabel(episode);
	});

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

	/** Scrolling up seeks forward. Scaled by the delta, so a trackpad's many small events don't race. Not passive, so the page doesn't scroll too. */
	function seekByWheel(element: HTMLElement) {
		return on(
			element,
			'wheel',
			(event) => {
				if (!player.duration) {
					return;
				}

				event.preventDefault();
				player.currentTime = Math.min(player.duration, Math.max(0, player.currentTime - (event.deltaY / wheelNotch) * wheelSeek));
			},
			{ passive: false },
		);
	}

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
			<button type="button" class="plain title" title={stopped ? 'Scroll title' : 'Stop scrolling'} bind:this={box} onclick={toggleScrolling}>
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
	<div class="buttons">
		{#if layout === 'tab'}
			<button type="button" class="icon" aria-label="Previous" title="Previous" onclick={player.previous}>
				<svg viewBox="0 0 16 16" aria-hidden="true">
					<path d="M3 3v10M13 3l-8 5 8 5z" />
				</svg>
			</button>
		{/if}
		{#if player.paused}
			<button type="button" class="icon" aria-label="Play" title="Play" onclick={player.resume}>
				<svg viewBox="0 0 16 16" aria-hidden="true">
					<path d="M4 2.5l9 5.5-9 5.5z" />
				</svg>
			</button>
		{:else}
			<button type="button" class="icon" aria-label="Pause" title="Pause" onclick={player.pause}>
				<svg viewBox="0 0 16 16" aria-hidden="true">
					<path d="M5 3v10M11 3v10" />
				</svg>
			</button>
		{/if}
		{#if layout === 'tab'}
			<button type="button" class="icon" aria-label="Next" title="Next" disabled={!player.hasNext} onclick={player.skip}>
				<svg viewBox="0 0 16 16" aria-hidden="true">
					<path d="M3 3l8 5-8 5zM13 3v10" />
				</svg>
			</button>
		{/if}
	</div>
	{#if layout === 'bar'}
		{@render title()}
	{/if}
	<!-- As tall as the row, so the wheel seeks without the pointer on the thin bar -->
	<div class="seek" {@attach seekByWheel}>
		<input
			type="range"
			aria-label="Seek"
			min="0"
			max={player.duration || 0}
			step="any"
			disabled={!player.duration}
			style:--progress={player.duration ? player.currentTime / player.duration : 0}
			value={player.currentTime}
			oninput={(e) => {
				player.currentTime = e.currentTarget.valueAsNumber;
			}}
		/>
	</div>
	<button type="button" class="plain time" title={player.showRemaining ? 'Show elapsed time' : 'Show remaining time'} onclick={player.toggleTime}
		><span class:hidden={!player.showRemaining}>-</span>{player.showRemaining
			? formatTime((player.duration || 0) - player.currentTime)
			: formatTime(player.currentTime)}{#if layout === 'tab'}{` / ${formatTime(player.duration || 0)}`}{/if}</button
	>
	<div class="buttons">
		{#if layout === 'tab'}
			<!-- Pressed in both repeat states, in the accent colour for repeat one -->
			<button type="button" class="icon" class:one={player.repeat === 'one'} aria-label="Repeat" title={repeatTitles[player.repeat]} aria-pressed={player.repeat !== 'off'} onclick={player.cycleRepeat}>
				<svg viewBox="0 0 16 16" aria-hidden="true">
					<path d="M2 9V4h11M10.5 1.5L13 4M14 7v5H3M5.5 14.5L3 12" />
				</svg>
			</button>
		{/if}
		<!-- Outlined, or filled in the accent colour when loved -->
		<button type="button" class="icon" class:loved={player.loved} aria-label="Love" title={player.loved ? 'Unlove' : 'Love'} aria-pressed={player.loved} onclick={player.toggleLove}>
			<svg viewBox="0 0 16 16" aria-hidden="true">
				<path d="M8 13.5C8 13.5 1.5 9.5 1.5 5.5 1.5 3.5 3 2 4.75 2 6.25 2 7.5 3 8 4.25 8.5 3 9.75 2 11.25 2 13 2 14.5 3.5 14.5 5.5 14.5 9.5 8 13.5 8 13.5z" />
			</svg>
		</button>
	</div>
</div>

{#if layout === 'tab'}
	<h2>{player.episode?.showTitle}</h2>
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
	h2,
	.label {
		text-transform: uppercase;
	}

	h2 {
		margin-block: 0.5rem 0;
	}

	.title {
		display: block;
		overflow: hidden;
		white-space: nowrap;
	}

	button.title {
		width: 100%;
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

	.one {
		border-color: var(--accent);
		background: var(--accent);
	}

	/* Pressed, but shown by the red heart rather than the inverted button. Hover still inverts, like every other button. */
	.loved:not(:hover) {
		background: none;
		color: inherit;
	}

	.loved svg {
		fill: var(--accent);
		stroke: var(--accent);
	}

	.time {
		font-variant-numeric: tabular-nums;
	}

	/* Keeps the minus's width, so toggling to remaining time doesn't resize the seek bar */
	.hidden {
		visibility: hidden;
	}

	.seek {
		flex: 1;
		align-self: stretch;
		display: flex;
		align-items: center;
	}

	/* A thin outlined bar, filled up to the playhead. The row centres it, so it sits where the taller bar did. */
	input {
		flex: 1;
		appearance: none;
		box-sizing: border-box;
		height: 0.5em;
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
		height: calc(0.5em - 2px);
		background: var(--ink);
	}
</style>
