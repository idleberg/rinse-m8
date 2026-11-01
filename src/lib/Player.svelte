<script lang="ts">
	import { invoke } from '@tauri-apps/api/core';
	import { load } from '@tauri-apps/plugin-store';
	import { tick } from 'svelte';
	import type { Episode } from './episodes';
	import { heardBetween, scrobbleAfter } from './listen';
	import PlayerControls from './PlayerControls.svelte';

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

	/** The props for a set of `PlayerControls`, so every set shows and changes the same playback. */
	export const controls = {
		get episode() {
			return episode;
		},
		get paused() {
			return paused;
		},
		get currentTime() {
			return currentTime;
		},
		get duration() {
			return duration;
		},
		get showRemaining() {
			return showRemaining;
		},
		onplay: () => episode && play(episode).catch(onerror),
		onpause: pause,
		onseek: (time: number) => {
			currentTime = time;
		},
		ontoggletime: () => {
			showRemaining = !showRemaining;
			localStorage.setItem('showRemaining', String(showRemaining));
		},
	};

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
		<PlayerControls {...controls} {episode} />
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
		border-top: 1px solid currentColor;
		padding: 0.5rem 1rem;
		background: var(--paper);
	}
</style>
