<script lang="ts">
	import { invoke } from '@tauri-apps/api/core';
	import { load } from '@tauri-apps/plugin-store';
	import { type ComponentProps, tick } from 'svelte';
	import { type Episode, moveItem } from './episodes';
	import { heardBetween, millisecondsPerSecond, scrobbleAfter } from './listen';
	import PlayerControls from './PlayerControls.svelte';

	let {
		episodes,
		playing = $bindable(null),
		queue = $bindable([]),
		onerror,
	}: {
		/** The episode cache, where the last-played episode is looked up at launch. */
		episodes: Episode[];
		/** The id of the episode while it's playing, not paused. */
		playing?: string | null;
		/** The play queue, played from the front once the current episode ends. */
		queue?: Episode[];
		onerror: (e: unknown) => void;
	} = $props();

	/** Of the last-played episode, in seconds. Only that episode resumes, the others start over. */
	let position = 0;
	let lastPlayed = $state<string | null>(null);
	let episode = $state<Episode | null>(null);
	let audio = $state<HTMLAudioElement>();
	let paused = $state(true);

	/** The bar stays hidden at launch, until something plays. */
	let shown = $state(false);
	let currentTime = $state(0);
	let duration = $state(0);
	let showRemaining = $state(localStorage.getItem('showRemaining') === 'true');
	let savedAt = 0;

	/** The episodes played this session, latest last, which PREV goes back through. Not saved. */
	let history: Episode[] = [];

	/** The current listen, which runs until another episode plays or this one ends: seconds heard, the playhead at the last count, and when it started in Unix seconds. */
	let heard = 0;
	let heardTo = 0;
	let started: number | null = null;
	let scrobbled = false;

	/** How often a playing episode's position is saved, in milliseconds. */
	const saveInterval = 5000;

	/** How far into an episode PREV restarts it rather than going back, in seconds. */
	const restartAfter = 3;

	const ready = load('player.json').then(async (store) => {
		position = (await store.get<number>('position')) ?? 0;
		lastPlayed = (await store.get<string>('lastPlayed')) ?? null;
		queue = (await store.get<Episode[]>('queue')) ?? [];

		return store;
	});

	ready.catch((e) => onerror(e));

	// At launch the last-played episode comes back paused, once the cache has loaded
	$effect(() => {
		if (!episode && lastPlayed) {
			episode = episodes.find((e) => e.id === lastPlayed) ?? null;
		}
	});

	/** Resumes the current episode, or starts another from the beginning. Going back doesn't add the current episode to the history. */
	export async function play(next: Episode, back = false) {
		const store = await ready;

		if (next.id === episode?.id) {
			savePosition(false);
		} else {
			// Only once something has played, so the episode restored at launch isn't history
			if (episode && shown && !back) {
				history.push(episode);
			}

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

	/** Waits for the stored queue, so loading it can't drop the new episode. An episode can be queued more than once. */
	export async function enqueue(added: Episode) {
		await ready;

		queue.push(added);
		persistQueue();
	}

	/** Takes the episode at `index` out of the play queue, leaving the rest in order. */
	export function dequeue(index: number) {
		const [removed] = queue.splice(index, 1);

		persistQueue();

		return removed;
	}

	/** Moves the episode at `from` in the play queue to `to`, which is the order auto-advance follows. */
	export function move(from: number, to: number) {
		queue = moveItem(queue, from, to);
		persistQueue();
	}

	export function clearQueue() {
		queue = [];
		persistQueue();
	}

	export function playFromQueue(index: number) {
		return play(dequeue(index));
	}

	export function pause() {
		audio?.pause();
	}

	/** Restarts the episode, or within its first seconds goes back to the one played before it and queues it first. */
	function previous() {
		const last = history.at(-1);

		if (!(episode && last) || currentTime > restartAfter) {
			currentTime = 0;

			return;
		}

		history.pop();
		queue.unshift(episode);
		persistQueue();
		play(last, true).catch(onerror);
	}

	/** The props for a set of `PlayerControls`, so every set shows and changes the same playback. */
	export const controls: ComponentProps<typeof PlayerControls> = {
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
		get queued() {
			return queue.length > 0;
		},
		onplay: () => episode && play(episode).catch(onerror),
		onpause: pause,
		onprevious: previous,
		onnext: () => queue.length > 0 && playFromQueue(0).catch(onerror),
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

	function persistQueue() {
		ready.then((store) => store.set('queue', $state.snapshot(queue))).catch((e) => onerror(e));
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
	<footer hidden={!shown}>
		<PlayerControls {...controls} />
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
				shown = true;
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

				if (queue.length > 0) {
					playFromQueue(0).catch(onerror);
				}
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
