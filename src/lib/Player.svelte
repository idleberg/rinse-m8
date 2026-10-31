<script lang="ts">
	import { invoke } from '@tauri-apps/api/core';
	import { load } from '@tauri-apps/plugin-store';
	import { tick } from 'svelte';
	import { type Episode, episodeLabel } from './episodes';
	import { heardBetween, scrobbleAfter } from './listen';

	let {
		episodes,
		playing = $bindable(null),
		onerror,
	}: {
		/** The episode cache, where the last-played episode is looked up at launch. */
		episodes: Episode[];
		/** The id of the episode while it's playing, not paused. */
		playing?: string | null;
		onerror: (e: unknown) => void;
	} = $props();

	/** Of the last-played episode, in seconds. Only that episode resumes, the others start over. */
	let position = 0;
	let lastPlayed = $state<string | null>(null);
	let episode = $state<Episode | null>(null);
	let audio = $state<HTMLAudioElement>();
	let paused = $state(true);
	let currentTime = $state(0);
	let duration = $state(0);
	let showRemaining = $state(localStorage.getItem('showRemaining') === 'true');
	let savedAt = 0;

	/** The current listen, which runs until another episode plays or this one ends: seconds heard, the playhead at the last count, and when it started in Unix seconds. */
	let heard = 0;
	let heardTo = 0;
	let started: number | null = null;
	let scrobbled = false;

	/** How often a playing episode's position is saved, in milliseconds. */
	const saveInterval = 5000;
	const millisecondsPerSecond = 1000;
	/** Where `h:mm:ss` sits in an ISO timestamp, past the hours' leading digit. */
	const isoTimeStart = 12;
	const isoTimeEnd = 19;

	const ready = load('player.json').then(async (store) => {
		position = (await store.get<number>('position')) ?? 0;
		lastPlayed = (await store.get<string>('lastPlayed')) ?? null;

		return store;
	});

	ready.catch((e) => onerror(e));

	// At launch the last-played episode comes back paused, once the cache has loaded
	$effect(() => {
		if (!episode && lastPlayed) {
			episode = episodes.find((e) => e.id === lastPlayed) ?? null;
		}
	});

	/** Resumes the current episode, or starts another from the beginning. */
	export async function play(next: Episode) {
		const store = await ready;

		if (next.id === episode?.id) {
			savePosition(false);
		} else {
			forgetPosition();
			endListen();
		}

		// The new source loads at once, so the old one's events can't save over the reset position
		episode = next;
		await tick();
		await store.set('lastPlayed', next.id);

		// Switching episodes while one is still loading aborts its play()
		try {
			await audio?.play();
		} catch (e) {
			if (!(e instanceof DOMException && e.name === 'AbortError')) {
				throw e;
			}
		}
	}

	export function pause() {
		audio?.pause();
	}

	/** As `h:mm:ss`, which fits mixes up to ten hours. */
	function formatTime(seconds: number) {
		return new Date(seconds * millisecondsPerSecond).toISOString().slice(isoTimeStart, isoTimeEnd);
	}

	function persistPosition() {
		ready.then((store) => store.set('position', position)).catch((e) => onerror(e));
	}

	function restorePosition() {
		if (audio) {
			audio.currentTime = position;
		}
	}

	/** Skipped while a new source loads, since the position then reads 0, and after the end, which `forgetPosition` handles. */
	function savePosition(throttle: boolean) {
		if (!(audio && episode) || audio.readyState === 0 || audio.ended || (throttle && Date.now() - savedAt < saveInterval)) {
			return;
		}

		savedAt = Date.now();
		position = audio.currentTime;
		persistPosition();
	}

	/** Scrobbles the episode once enough of it has been heard. */
	function countHeard() {
		if (!(audio && episode)) {
			return;
		}

		// Dragging the seek bar moves the playhead in small steps too
		if (!(audio.paused || audio.seeking)) {
			heard += heardBetween(heardTo, audio.currentTime);
		}

		heardTo = audio.currentTime;

		if (!scrobbled && started !== null && heard >= scrobbleAfter(audio.duration)) {
			scrobbled = true;
			invoke('scrobble', { episode, started }).catch(onerror);
		}
	}

	/** So the next play counts, and can scrobble, from scratch. */
	function endListen() {
		heard = 0;
		heardTo = 0;
		started = null;
		scrobbled = false;
	}

	/** On switching episodes, and when one finishes, so it starts over next time. */
	function forgetPosition() {
		position = 0;
		persistPosition();
	}
</script>

{#if episode?.mp3}
	<footer>
		{#if paused}
			<button type="button" class="icon" aria-label="Play" title="Play" onclick={() => episode && play(episode).catch(onerror)}>
				<svg viewBox="0 0 16 16" aria-hidden="true">
					<path d="M4 2.5l9 5.5-9 5.5z" />
				</svg>
			</button>
		{:else}
			<button type="button" class="icon" aria-label="Pause" title="Pause" onclick={pause}>
				<svg viewBox="0 0 16 16" aria-hidden="true">
					<path d="M5 3v10M11 3v10" />
				</svg>
			</button>
		{/if}
		<span>{episodeLabel(episode)}</span>
		<input
			type="range"
			aria-label="Seek"
			min="0"
			max={duration || 0}
			step="any"
			disabled={!duration}
			style:--progress={duration ? currentTime / duration : 0}
			bind:value={currentTime}
		/>
		<button
			type="button"
			class="time"
			title={showRemaining ? 'Show elapsed time' : 'Show remaining time'}
			onclick={() => {
				showRemaining = !showRemaining;
				localStorage.setItem('showRemaining', String(showRemaining));
			}}
			><span class:hidden={!showRemaining}>-</span>{showRemaining
				? formatTime((duration || 0) - currentTime)
				: formatTime(currentTime)}</button
		>
		<!-- biome-ignore lint/a11y/useMediaCaption: Rinse has no captions for its mixes -->
		<audio
			bind:this={audio}
			src={episode.mp3}
			bind:paused
			bind:currentTime
			bind:duration
			preload="metadata"
			onloadedmetadata={restorePosition}
			ontimeupdate={() => {
				countHeard();
				savePosition(true);
			}}
			onseeked={() => savePosition(false)}
			onplay={() => {
				playing = episode?.id ?? null;
				started ??= Math.floor(Date.now() / millisecondsPerSecond);

				if (episode) {
					invoke('now_playing', { episode }).catch(onerror);
				}
			}}
			onpause={() => {
				playing = null;
				savePosition(false);
			}}
			onended={() => {
				forgetPosition();
				endListen();
			}}
			onerror={() => episode && invoke('recheck_mp3', { id: episode.id }).catch(onerror)}
		></audio>
	</footer>
{/if}

<style>
	footer {
		display: flex;
		gap: 1rem;
		align-items: center;
		border-top: 1px solid currentColor;
		padding: 0.5rem 1rem;
		background: var(--paper);
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
