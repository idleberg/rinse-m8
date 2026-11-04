import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { load, type Store } from '@tauri-apps/plugin-store';
import { tick } from 'svelte';
import { confirm } from './confirm.svelte';
import { type Episode, moveItem } from './episodes';
import { episodes } from './episodes.svelte';
import { errors } from './errors.svelte';
import {
	heardBetween,
	millisecondsPerSecond,
	type Repeat,
	repeatModes,
	scrobbleAfter,
} from './listen';

/** How often a playing episode's position is saved, in milliseconds. */
const saveInterval = 5000;

/** How far into an episode PREV restarts it rather than going back, in seconds. */
const restartAfter = 3;

/** Playback, the play queue and loves, shared by the player bar, the Player tab, the episode tables and the tray.
 * `Player.svelte` owns the `<audio>` element, binds it to `audio`, and forwards its events to the `handle…`
 * methods. */
class Player {
	/** Null until an episode is loaded. */
	episode = $state<Episode | null>(null);
	paused = $state(true);
	/** The playhead, in seconds. Setting it seeks. */
	currentTime = $state(0);
	/** In seconds, 0 until the metadata loads. */
	duration = $state(0);
	/** Whether the time reads as remaining rather than elapsed. */
	showRemaining = $state(false);
	repeat = $state<Repeat>('off');
	/** The play queue, played from the front once the current episode ends. An episode can be queued more than once. */
	queue = $state<Episode[]>([]);
	/** The id of the episode while it's playing, not paused. */
	playing = $derived(this.paused ? null : (this.episode?.id ?? null));
	/** Whether NEXT has an episode to play: one in the play queue, or the current one under repeat all. */
	queued = $derived(this.queue.length > 0 || (this.repeat === 'all' && this.episode !== null));
	/** The ids of loved episodes, kept by the app and never read from Last.fm. */
	#lovedIds = $state<string[]>([]);
	loved = $derived(this.episode !== null && this.#lovedIds.includes(this.episode.id));
	audio: HTMLAudioElement | undefined;

	#lastPlayed = $state<string | null>(null);
	/** Of the last-played episode, in seconds. Only that episode resumes, the others start over. */
	#position = 0;
	#savedAt = 0;
	/** Whether something has played this session, so the episode restored at launch isn't history. */
	#played = false;
	/** The episodes played this session, latest last, which PREV goes back through. Not saved. */
	readonly #history: Episode[] = [];

	/** The current listen, which runs until another episode plays or this one ends: seconds heard, the playhead at
	 * the last count, and when it started in Unix seconds. */
	#heard = 0;
	#heardTo = 0;
	#started: number | null = null;
	#scrobbled = false;

	#ready!: Promise<Store>;

	// Arrow functions, so they can be passed as callbacks such as `onclick={player.pause}`

	/** Resumes the current episode, or starts another from the beginning. */
	play = (chosen: Episode) => this.#play(chosen).catch(errors.report);

	/** Resumes the current episode, if one is loaded. */
	resume = () => this.episode && this.play(this.episode);

	pause = () => this.audio?.pause();

	/** Waits for the stored queue, so loading it can't drop the new episode. */
	enqueue = async (added: Episode) => {
		try {
			await this.#ready;
			this.queue.push(added);
			this.#persistQueue();
		} catch (e) {
			errors.report(e);
		}
	};

	/** Takes the episode at `index` out of the play queue, leaving the rest in order. */
	dequeue = (index: number) => {
		const [removed] = this.queue.splice(index, 1);

		this.#persistQueue();

		return removed;
	};

	/** Moves the episode at `from` in the play queue to `to`, which is the order auto-advance follows. */
	move = (from: number, to: number) => {
		this.queue = moveItem(this.queue, from, to);
		this.#persistQueue();
	};

	/** Empties the play queue, once confirmed. */
	clearQueue = async () => {
		if (
			await confirm({ title: 'Clear Queue', message: 'Clear the play queue?', action: 'Clear' })
		) {
			this.queue = [];
			this.#persistQueue();
		}
	};

	playFromQueue = (index: number) => this.play(this.dequeue(index));

	/** Plays the first queued episode, from the start even if it's the current one. Repeat all queues the current
	 * episode last, so the queue loops. */
	skip = async () => {
		if (this.repeat === 'all' && this.episode) {
			this.queue.push(this.episode);
		}

		if (this.queue.length === 0) {
			return;
		}

		const first = this.dequeue(0);

		if (first.id === this.episode?.id) {
			this.currentTime = 0;
		}

		await this.play(first);
	};

	/** Restarts the episode, or within its first seconds goes back to the one played before it and queues it first. */
	previous = async () => {
		const last = this.#history.at(-1);

		if (!(this.episode && last) || this.currentTime > restartAfter) {
			this.currentTime = 0;

			return;
		}

		this.#history.pop();

		// Repeat all queued it last when it ended or was skipped
		if (this.repeat === 'all' && this.queue.at(-1)?.id === last.id) {
			this.queue.pop();
		}

		this.queue.unshift(this.episode);
		this.#persistQueue();
		await this.#play(last, true).catch(errors.report);
	};

	/** Waits for the stored loves, so loading them can't undo the change. Only a love goes to Last.fm, which has no
	 * unlove. */
	toggleLove = async () => {
		try {
			const store = await this.#ready;

			if (!this.episode) {
				return;
			}

			const { id } = this.episode;
			const loving = !this.#lovedIds.includes(id);

			this.#lovedIds = loving
				? [...this.#lovedIds, id]
				: this.#lovedIds.filter((lovedId) => lovedId !== id);
			await store.set('loved', $state.snapshot(this.#lovedIds));

			if (loving) {
				invoke('love', { episode: this.episode }).catch(errors.report);
			}
		} catch (e) {
			errors.report(e);
		}
	};

	toggleTime = () => {
		this.showRemaining = !this.showRemaining;
		localStorage.setItem('showRemaining', String(this.showRemaining));
	};

	cycleRepeat = () => {
		this.repeat = repeatModes[(repeatModes.indexOf(this.repeat) + 1) % repeatModes.length];
		localStorage.setItem('repeat', this.repeat);
	};

	handleLoadedMetadata = () => {
		if (this.audio) {
			this.audio.currentTime = this.#position;
		}
	};

	handleTimeUpdate = () => {
		this.#countHeard();
		this.#savePosition(true);
	};

	handleSeeked = () => this.#savePosition(false);

	handlePlay = () => {
		this.#played = true;
		this.#started ??= Math.floor(Date.now() / millisecondsPerSecond);

		if (this.episode) {
			invoke('now_playing', { episode: this.episode }).catch(errors.report);
		}
	};

	handlePause = () => this.#savePosition(false);

	handleEnded = () => {
		this.#forgetPosition();
		this.#endListen();

		// Starting over counts as a new listen
		if (this.repeat === 'one' && this.episode) {
			this.play(this.episode);
		} else {
			this.skip();
		}
	};

	handleError = () => {
		if (this.episode) {
			invoke('recheck_mp3', { id: this.episode.id }).catch(errors.report);
		}
	};

	init() {
		this.showRemaining = localStorage.getItem('showRemaining') === 'true';
		this.repeat = repeatModes.find((mode) => mode === localStorage.getItem('repeat')) ?? 'off';

		this.#ready = load('player.json').then(async (store) => {
			this.#position = (await store.get<number>('position')) ?? 0;
			this.#lastPlayed = (await store.get<string>('lastPlayed')) ?? null;
			this.queue = (await store.get<Episode[]>('queue')) ?? [];
			this.#lovedIds = (await store.get<string[]>('loved')) ?? [];

			return store;
		});

		this.#ready.catch(errors.report);

		// The tray menu's play/pause item
		listen('toggle-playback', () => (this.playing ? this.pause() : this.resume())).catch(
			errors.report,
		);

		// A root, so the effects don't need a component to run in
		$effect.root(() => {
			// At launch the last-played episode comes back paused, once the cache has loaded
			$effect(() => {
				if (!this.episode && this.#lastPlayed) {
					this.episode = episodes.list.find((e) => e.id === this.#lastPlayed) ?? null;
				}
			});

			$effect(() => {
				invoke('set_tray_playing', { playing: this.playing !== null }).catch(errors.report);
			});
		});
	}

	/** Going back doesn't add the current episode to the history. */
	async #play(chosen: Episode, back = false) {
		const store = await this.#ready;

		// Queued and past episodes are stored copies, which can predate the cache's artwork and mp3
		const next = episodes.list.find((e) => e.id === chosen.id) ?? chosen;

		if (next.id === this.episode?.id) {
			this.#savePosition(false);
		} else {
			// Only once something has played, so the episode restored at launch isn't history
			if (this.episode && this.#played && !back) {
				this.#history.push(this.episode);
			}

			this.#forgetPosition();
			this.#endListen();
		}

		// The new source loads at once, so the old one's events can't save over the reset position
		this.episode = next;
		await tick();
		await store.set('lastPlayed', next.id);

		// Switching episodes while one is still loading aborts its play()
		try {
			await this.audio?.play();
		} catch (e) {
			if (!(e instanceof DOMException && e.name === 'AbortError')) {
				throw e;
			}
		}
	}

	#persistPosition() {
		this.#ready.then((store) => store.set('position', this.#position)).catch(errors.report);
	}

	#persistQueue() {
		this.#ready
			.then((store) => store.set('queue', $state.snapshot(this.queue)))
			.catch(errors.report);
	}

	/** Skipped while a new source loads, since the position then reads 0, and after the end, which `#forgetPosition`
	 * handles. */
	#savePosition(throttle: boolean) {
		const { audio } = this;

		if (
			!(audio && this.episode) ||
			audio.readyState === 0 ||
			audio.ended ||
			(throttle && Date.now() - this.#savedAt < saveInterval)
		) {
			return;
		}

		this.#savedAt = Date.now();
		this.#position = audio.currentTime;
		this.#persistPosition();
	}

	/** Scrobbles the episode once enough of it has been heard. */
	#countHeard() {
		const { audio, episode } = this;

		if (!(audio && episode)) {
			return;
		}

		// Dragging the seek bar moves the playhead in small steps too
		if (!(audio.paused || audio.seeking)) {
			this.#heard += heardBetween(this.#heardTo, audio.currentTime);
		}

		this.#heardTo = audio.currentTime;

		if (
			!this.#scrobbled &&
			this.#started !== null &&
			this.#heard >= scrobbleAfter(audio.duration)
		) {
			this.#scrobbled = true;
			invoke('scrobble', { episode, started: this.#started }).catch(errors.report);
		}
	}

	/** So the next play counts, and can scrobble, from scratch. */
	#endListen() {
		this.#heard = 0;
		this.#heardTo = 0;
		this.#started = null;
		this.#scrobbled = false;
	}

	/** On switching episodes, and when one finishes, so it starts over next time. */
	#forgetPosition() {
		this.#position = 0;
		this.#persistPosition();
	}
}

export const player = new Player();
