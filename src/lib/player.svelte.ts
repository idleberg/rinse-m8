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
import { settings } from './settings.svelte';

/** How often a playing episode's position is saved, in milliseconds. */
const saveInterval = 5000;

/** How far into an episode PREV restarts it rather than going back, in seconds. */
const restartAfter = 3;

/** A listen runs until another episode plays or this one ends. */
interface Listen {
	/** Seconds heard. */
	heard: number;
	/** The playhead at the last count. */
	heardTo: number;
	/** In Unix seconds, once it starts playing. */
	started: number | null;
	scrobbled: boolean;
}

/** So a listen counts, and can scrobble, from scratch. */
function freshListen(): Listen {
	return { heard: 0, heardTo: 0, started: null, scrobbled: false };
}

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
	playQueue = $state<Episode[]>([]);
	/** The id of the episode while it's playing, not paused. */
	playing = $derived(this.paused ? null : (this.episode?.id ?? null));
	/** Whether NEXT has an episode to play: one in the play queue, or the current one under either repeat. */
	hasNext = $derived(this.playQueue.length > 0 || (this.repeat !== 'off' && this.episode !== null));
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

	#listen = freshListen();

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
			this.playQueue.push(added);
			this.#persistQueue();
		} catch (e) {
			errors.report(e);
		}
	};

	/** Takes the episode at `index` out of the play queue, leaving the rest in order. */
	dequeue = (index: number) => {
		const [removed] = this.playQueue.splice(index, 1);

		this.#persistQueue();

		return removed;
	};

	/** Moves the episode at `from` in the play queue to `to`, which is the order auto-advance follows. */
	move = (from: number, to: number) => {
		this.playQueue = moveItem(this.playQueue, from, to);
		this.#persistQueue();
	};

	/** Empties the play queue, once confirmed. */
	clearQueue = async () => {
		if (
			await confirm({ title: 'Clear Queue', message: 'Clear the play queue?', action: 'Clear' })
		) {
			this.playQueue = [];
			this.#persistQueue();
		}
	};

	playFromQueue = (index: number) => this.play(this.dequeue(index));

	/** Plays the first queued episode, from the start even if it's the current one. Repeat all queues the current
	 * episode last, so the queue loops. Repeat one leaves for the queue, or restarts the episode when it's empty. */
	skip = async () => {
		if (
			this.episode &&
			(this.repeat === 'all' || (this.repeat === 'one' && this.playQueue.length === 0))
		) {
			this.playQueue.push(this.episode);
		}

		if (this.playQueue.length === 0) {
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
		if (this.repeat === 'all' && this.playQueue.at(-1)?.id === last.id) {
			this.playQueue.pop();
		}

		this.playQueue.unshift(this.episode);
		this.#persistQueue();
		await this.#play(last, true).catch(errors.report);
	};

	/** Waits for the stored loves, so loading them can't undo the change. Only a love goes to Last.fm, which has no
	 * unlove. */
	toggleLove = async () => {
		try {
			await this.#ready;

			if (!this.episode) {
				return;
			}

			const { id } = this.episode;
			const loving = !this.#lovedIds.includes(id);

			this.#lovedIds = loving
				? [...this.#lovedIds, id]
				: this.#lovedIds.filter((lovedId) => lovedId !== id);
			await this.#save('loved', $state.snapshot(this.#lovedIds));

			if (loving) {
				invoke('love', { episode: this.episode }).catch(errors.report);
			}
		} catch (e) {
			errors.report(e);
		}
	};

	/** Loads the first cached episode with an mp3, paused, for the dev panel. Nothing is saved until it plays. */
	fake = () => {
		this.pause();
		this.episode = episodes.list.find((e) => e.mp3) ?? this.episode;
	};

	/** Puts the player back as if nothing had ever played, for the dev panel. The play queue stays, and so does
	 * `player.json`, which brings the real state back at the next launch. */
	reset = () => {
		this.pause();
		this.episode = null;
		this.#lastPlayed = null;
		this.#position = 0;
		this.#played = false;
		this.#history.length = 0;
		this.#listen = freshListen();
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
		this.#listen.started ??= Math.floor(Date.now() / millisecondsPerSecond);

		if (this.episode) {
			invoke('now_playing', { episode: this.episode }).catch(errors.report);
		}
	};

	handlePause = () => this.#savePosition(false);

	handleEnded = () => {
		this.#forgetPosition();
		this.#listen = freshListen();

		// Starting over counts as a new listen
		if (this.repeat === 'one' && this.episode) {
			this.play(this.episode);
		} else if (this.hasNext || !settings.stored.clearPlayer) {
			this.skip();
		} else {
			// Forgotten too, so it doesn't come back at the next launch
			this.episode = null;
			this.#lastPlayed = null;
			this.#save('lastPlayed', null);
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
			this.playQueue = (await store.get<Episode[]>('queue')) ?? [];
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
		await this.#ready;

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
			this.#listen = freshListen();
		}

		// The new source loads at once, so the old one's events can't save over the reset position
		this.episode = next;
		await tick();
		await this.#save('lastPlayed', next.id);

		// Switching episodes while one is still loading aborts its play()
		try {
			await this.audio?.play();
		} catch (e) {
			if (!(e instanceof DOMException && e.name === 'AbortError')) {
				throw e;
			}
		}
	}

	/** Writes to `player.json` once it has loaded, so the load can't overwrite the change. Reports a failure. */
	#save(key: string, value: unknown) {
		return this.#ready.then((store) => store.set(key, value)).catch(errors.report);
	}

	#persistQueue() {
		this.#save('queue', $state.snapshot(this.playQueue));
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
		this.#save('position', this.#position);
	}

	/** Scrobbles the episode once enough of it has been heard. */
	#countHeard() {
		const { audio, episode } = this;
		const current = this.#listen;

		if (!(audio && episode)) {
			return;
		}

		// Dragging the seek bar moves the playhead in small steps too
		if (!(audio.paused || audio.seeking)) {
			current.heard += heardBetween(current.heardTo, audio.currentTime);
		}

		current.heardTo = audio.currentTime;

		if (
			!current.scrobbled &&
			current.started !== null &&
			current.heard >= scrobbleAfter(audio.duration)
		) {
			current.scrobbled = true;
			invoke('scrobble', { episode, started: current.started }).catch(errors.report);
		}
	}

	/** On switching episodes, and when one finishes, so it starts over next time. */
	#forgetPosition() {
		this.#position = 0;
		this.#save('position', 0);
	}
}

export const player = new Player();
