import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { load, type Store } from '@tauri-apps/plugin-store';
import { tick, untrack } from 'svelte';
import { choose, confirm } from './confirm.svelte';
import { type DownloadQueue, type Episode, moveItem } from './episodes';
import { episodes } from './episodes.svelte';
import { errors } from './errors.svelte';
import {
	countPlayAfter,
	heardBetween,
	millisecondsPerSecond,
	parseVolume,
	type Repeat,
	repeatModes,
	scrobbleAfter,
} from './listen';
import { settings } from './settings.svelte';

/** How often a playing episode's position is saved, in milliseconds. */
const saveInterval = 5000;

// ponytail: capped at 500 so player.json stays small, page it from its own store if more is wanted
/** How many episodes the play history keeps. */
const historyLimit = 500;

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
	/** Whether it has counted as a play. */
	counted: boolean;
}

/** So a listen counts, and can scrobble, from scratch. */
function freshListen(): Listen {
	return { heard: 0, heardTo: 0, started: null, scrobbled: false, counted: false };
}

/** Looks for the episode's download, which the backend then lets the `<audio>` read. A failed lookup streams. */
async function findFile(episode: Episode) {
	const path = await invoke<string | null>('local_file', { episode }).catch((e) => {
		errors.report(e);

		return null;
	});

	return { id: episode.id, path: path ?? null };
}

/** The stored seen list. Before it existed, the dashboard hid downloaded episodes, so until one is stored it starts as a
 * copy of the downloaded record. Not stored when that lookup fails, so the next launch copies it. */
async function loadSeen(store: Store) {
	const seen = await store.get<string[]>('seen');

	if (seen) {
		return seen;
	}

	const queue = await invoke<DownloadQueue>('get_download_queue').catch(errors.report);

	if (!queue) {
		return [];
	}

	await store.set('seen', queue.downloaded);

	return queue.downloaded;
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
	/** Between 0 and 1. Change it through `setVolume`, which saves it. */
	volume = $state(1);
	/** The volume to go back to when unmuting. Saved, so it outlasts a restart while muted. */
	#unmutedVolume = 1;
	/** The play queue, played from the front once the current episode ends. An episode can be queued more than once. */
	playQueue = $state<Episode[]>([]);
	/** The episodes listened to, latest first, each once. Saved, and separate from the session stack PREV uses. */
	playHistory = $state<Episode[]>([]);
	/** The id of the episode while it's playing, not paused. */
	playing = $derived(this.paused ? null : (this.episode?.id ?? null));
	/** Whether NEXT has an episode to play: one in the play queue, or the current one under either repeat. */
	hasNext = $derived(this.playQueue.length > 0 || (this.repeat !== 'off' && this.episode !== null));
	/** The ids of loved episodes, kept by the app and never read from Last.fm. Change them through `toggleLove`. */
	lovedIds = $state<string[]>([]);
	loved = $derived(this.episode !== null && this.lovedIds.includes(this.episode.id));
	/** How often each episode has been played, by episode id. An episode never played has no entry. */
	plays = $state<Record<string, number>>({});
	/** The ids of episodes marked seen from their flyout. Change them through `toggleSeen`. A played episode counts as
	 * seen without being listed, see `isSeen`. */
	seenIds = $state<string[]>([]);
	/** `seenIds` as a set, since the dashboard checks every row against it, and the copied downloaded record can be long. */
	#seen = $derived(new Set(this.seenIds));
	/** What the `<audio>` plays: the episode's download, or its stream when there's none. Unset until `findFile`
	 * has looked for the download. */
	src = $derived.by(() => {
		const { episode } = this;
		const file = this.#file;

		if (!(episode && file?.id === episode.id)) {
			return;
		}

		return file.path ? convertFileSrc(file.path) : (episode.mp3 ?? undefined);
	});
	audio: HTMLAudioElement | undefined;

	#lastPlayed = $state<string | null>(null);
	/** The download `findFile` found for an episode, null when it streams. */
	#file = $state<{ id: string; path: string | null } | null>(null);
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

	/** PLAY on an episode row. While another episode plays, it plays, queues or asks, as the Play behaviour setting
	 * says. Otherwise it just plays. */
	playOrQueue = async (chosen: Episode) => {
		if (this.playing === null || chosen.id === this.playing) {
			return this.play(chosen);
		}

		let behaviour = settings.stored.playBehaviour;

		if (behaviour === 'ask') {
			const choice = await choose({
				title: 'Play',
				message: "You're already playing an episode.",
				primaryAction: 'Play',
				secondaryAction: 'Queue',
			});

			if (!choice) {
				return;
			}

			behaviour = choice === 'primary' ? 'play' : 'queue';
		}

		return behaviour === 'play' ? this.play(chosen) : this.enqueue(chosen);
	};

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
			await confirm({
				title: 'Clear Queue',
				message: 'Clear the play queue?',
				primaryAction: 'Clear',
				secondaryAction: 'Cancel',
			})
		) {
			this.playQueue = [];
			this.#persistQueue();
		}
	};

	/** Empties the play history, once confirmed. PREV keeps its own session stack. */
	clearHistory = async () => {
		if (
			await confirm({
				title: 'Clear History',
				message: 'Clear the play history?',
				primaryAction: 'Clear',
				secondaryAction: 'Cancel',
			})
		) {
			this.playHistory = [];
			this.#save('history', []);
		}
	};

	/** Drops `removed` from the play history, once confirmed. PREV keeps its own session stack. */
	removeFromHistory = async (removed: Episode) => {
		if (
			await confirm({
				title: 'Remove from History',
				message: `Remove ${removed.showTitle} from the play history?`,
				primaryAction: 'Remove',
				secondaryAction: 'Cancel',
			})
		) {
			this.playHistory = this.playHistory.filter((e) => e.id !== removed.id);
			this.#save('history', $state.snapshot(this.playHistory));
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

	/** Loves or unloves `episode`, the loaded one by default. Waits for the stored loves, so loading them can't undo the
	 * change. Only a love goes to Last.fm, which has no unlove. */
	toggleLove = async (episode = this.episode) => {
		try {
			await this.#ready;

			if (!episode) {
				return;
			}

			const { id } = episode;
			const loving = !this.lovedIds.includes(id);

			this.lovedIds = loving
				? [...this.lovedIds, id]
				: this.lovedIds.filter((lovedId) => lovedId !== id);
			await this.#save('loved', $state.snapshot(this.lovedIds));

			if (loving) {
				invoke('love', { episode }).catch(errors.report);
			}
		} catch (e) {
			errors.report(e);
		}
	};

	/** Whether the dashboard leaves the episode out: it was marked seen, or it has been played at least once. */
	isSeen = (id: string) => this.#seen.has(id) || id in this.plays;

	/** Marks `episode` seen or unseen. Waits for the stored list, so loading it can't undo the change. */
	toggleSeen = async (episode: Episode) => {
		try {
			await this.#ready;

			const { id } = episode;

			this.seenIds = this.#seen.has(id)
				? this.seenIds.filter((seenId) => seenId !== id)
				: [...this.seenIds, id];
			await this.#save('seen', $state.snapshot(this.seenIds));
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

	setVolume = (volume: number) => {
		this.volume = volume;
		localStorage.setItem('volume', String(volume));
	};

	toggleMute = () => {
		if (this.volume) {
			this.#unmutedVolume = this.volume;
			localStorage.setItem('unmutedVolume', String(this.volume));
			this.setVolume(0);
		} else {
			this.setVolume(this.#unmutedVolume);
		}
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
		const { episode } = this;
		const fresh = this.#listen.started === null;

		this.#played = true;
		this.#listen.started ??= Math.floor(Date.now() / millisecondsPerSecond);

		// A new listen, not a resume, moves it to the top
		if (episode && fresh) {
			this.playHistory = [episode, ...this.playHistory.filter((e) => e.id !== episode.id)].slice(
				0,
				historyLimit,
			);
			this.#save('history', $state.snapshot(this.playHistory));
		}

		if (episode) {
			invoke('now_playing', { episode }).catch(errors.report);
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

	/** A failing download, e.g. deleted or renamed, falls back to the stream where it was. A failing stream gets its
	 * mp3 checked again. */
	handleError = () => {
		const { episode } = this;

		if (!episode) {
			return;
		}

		if (this.#file?.id === episode.id && this.#file.path) {
			const playing = !this.paused;

			// Skipped when the file failed before loading, keeping the saved position
			this.#savePosition(false);
			this.#file = { id: episode.id, path: null };

			if (playing) {
				tick()
					.then(() => this.audio?.play())
					.catch(errors.report);
			}

			return;
		}

		invoke('recheck_mp3', { id: episode.id }).catch(errors.report);
	};

	init() {
		this.showRemaining = localStorage.getItem('showRemaining') === 'true';
		this.repeat = repeatModes.find((mode) => mode === localStorage.getItem('repeat')) ?? 'off';
		this.volume = parseVolume(localStorage.getItem('volume'));
		this.#unmutedVolume = parseVolume(localStorage.getItem('unmutedVolume'));

		this.#ready = load('player.json').then(async (store) => {
			this.#position = (await store.get<number>('position')) ?? 0;
			this.#lastPlayed = (await store.get<string>('lastPlayed')) ?? null;
			this.playQueue = (await store.get<Episode[]>('queue')) ?? [];
			this.lovedIds = (await store.get<string[]>('loved')) ?? [];
			this.playHistory = (await store.get<Episode[]>('history')) ?? [];
			this.plays = (await store.get<Record<string, number>>('plays')) ?? {};
			this.seenIds = await loadSeen(store);

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
					this.episode = episodes.all.find((e) => e.id === this.#lastPlayed) ?? null;
				}
			});

			// An episode loaded without `#play`, e.g. at launch, still needs its source
			$effect(() => {
				const { episode } = this;

				if (episode && untrack(() => this.#file?.id) !== episode.id) {
					findFile(episode).then((file) => {
						// Unless `#play` loaded another episode meanwhile
						if (this.episode?.id === file.id) {
							this.#file = file;
						}
					});
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
		const next = episodes.all.find((e) => e.id === chosen.id) ?? chosen;
		// Looked up on every play, so a download deleted since then streams. First, so the old episode's events
		// can't save over the reset position while it's looked up
		const file = await findFile(next);

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
		this.#file = file;
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

	/** Scrobbles the episode, and counts it as a play, once enough of it has been heard. */
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

		if (!current.counted && current.heard >= countPlayAfter(audio.duration)) {
			current.counted = true;
			this.plays[episode.id] = (this.plays[episode.id] ?? 0) + 1;
			this.#save('plays', $state.snapshot(this.plays));
		}
	}

	/** On switching episodes, and when one finishes, so it starts over next time. */
	#forgetPosition() {
		this.#position = 0;
		this.#save('position', 0);
	}
}

export const player = new Player();
