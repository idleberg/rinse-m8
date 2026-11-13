/// <reference types="bun" />

import { afterEach, beforeEach, describe, expect, test as it, mock } from 'bun:test';
import type { Episode } from './episodes';

function episode(id: string): Episode {
	return { id, date: '2026-01-01', time: '12:00', mp3: `${id}.mp3` } as Episode;
}

const a = episode('a');
const b = episode('b');
const c = episode('c');

const calls: [string, unknown][] = [];
/** The download-folder file of each episode that has one, by episode id. */
const files = new Map<string, string>();
const stored = new Map<string, unknown>([
	['lastPlayed', 'b'],
	['queue', [c]],
	['history', [a]],
	['plays', { c: 2 }],
]);

mock.module('@tauri-apps/api/core', () => ({
	invoke: async (command: string, args?: { episode?: Episode }) => {
		calls.push([command, args]);

		if (command === 'local_file') {
			return files.get(args?.episode?.id ?? '') ?? null;
		}
	},
	convertFileSrc: (path: string) => `asset://${path}`,
}));

mock.module('@tauri-apps/api/event', () => ({
	listen: async () => {},
}));

mock.module('@tauri-apps/plugin-store', () => ({
	load: async () => ({
		get: async (key: string) => stored.get(key),
		set: async (key: string, value: unknown) => {
			stored.set(key, value);
		},
	}),
}));

const local = new Map<string, string>([['volume', '0.4']]);

globalThis.localStorage = {
	getItem: (key: string) => local.get(key) ?? null,
	setItem: (key: string, value: string) => {
		local.set(key, value);
	},
} as unknown as Storage;

const { flushSync } = await import('svelte');
const { player } = await import('./player.svelte');
const { episodes } = await import('./episodes.svelte');
const { confirmation } = await import('./confirm.svelte');
const { settings } = await import('./settings.svelte');

episodes.replace([a, b, c]);
player.init();

/** Lets the store's loads and writes settle. */
function settle() {
	return new Promise((resolve) => setTimeout(resolve));
}

beforeEach(async () => {
	await settle();
	calls.length = 0;
	player.repeat = 'off';
});

it('brings back the last-played episode, the stored queue, the history and the plays at launch', async () => {
	await settle();
	flushSync();

	expect(player.episode?.id).toBe('b');
	expect(player.playQueue.map((e) => e.id)).toEqual(['c']);
	expect(player.playHistory.map((e) => e.id)).toEqual(['a']);
	expect(player.plays).toEqual({ c: 2 });
});

it('brings back the stored volume at launch, and stores a new one', () => {
	expect(player.volume).toBe(0.4);

	player.setVolume(0.7);

	expect(player.volume).toBe(0.7);
	expect(local.get('volume')).toBe('0.7');
});

it('mutes, and unmutes back to the stored level', () => {
	player.setVolume(0.6);
	player.toggleMute();

	expect(player.volume).toBe(0);
	expect(local.get('unmutedVolume')).toBe('0.6');

	player.toggleMute();

	expect(player.volume).toBe(0.6);
});

it('plays the first queued episode on NEXT, and under repeat all queues the current one last', async () => {
	await player.play(a);
	player.playQueue = [b, c];
	player.repeat = 'all';

	await player.skip();

	expect(player.episode?.id).toBe('b');
	expect(player.playQueue.map((e) => e.id)).toEqual(['c', 'a']);
});

it('leaves for the queue on NEXT under repeat one, and restarts the episode once the queue is empty', async () => {
	await player.play(a);
	player.playQueue = [b];
	player.repeat = 'one';

	await player.skip();

	expect(player.episode?.id).toBe('b');
	expect(player.playQueue).toEqual([]);
	expect(player.hasNext).toBe(true);

	player.currentTime = 10;
	await player.skip();

	expect(player.episode?.id).toBe('b');
	expect(player.currentTime).toBe(0);
	expect(player.playQueue).toEqual([]);
});

it('goes back to the episode played before on PREV, and queues the current one first', async () => {
	player.playQueue = [];
	await player.play(a);
	player.handlePlay();
	await player.play(b);

	await player.previous();

	expect(player.episode?.id).toBe('a');
	expect(player.playQueue.map((e) => e.id)).toEqual(['b']);
});

it('restarts the episode on PREV once past its first seconds', async () => {
	await player.play(a);
	player.handlePlay();
	await player.play(b);
	player.currentTime = 10;

	await player.previous();

	expect(player.episode?.id).toBe('b');
	expect(player.currentTime).toBe(0);
});

it('stores the play queue as it is queued, reordered and dequeued', async () => {
	player.playQueue = [];
	await player.enqueue(a);
	await player.enqueue(b);
	await player.enqueue(c);
	player.move(2, 0);
	player.dequeue(1);
	await settle();

	expect((stored.get('queue') as Episode[]).map((e) => e.id)).toEqual(['c', 'b']);
});

it('clears the play queue only once confirmed', async () => {
	player.playQueue = [a];

	const declined = player.clearQueue();

	confirmation.answer();
	await declined;
	expect(player.playQueue).toHaveLength(1);

	const confirmed = player.clearQueue();

	confirmation.answer('primary');
	await confirmed;
	await settle();
	expect(player.playQueue).toEqual([]);
	expect(stored.get('queue')).toEqual([]);
});

it('clears the history only once confirmed, leaving PREV its session stack', async () => {
	await player.play(a);
	player.handlePlay();
	await player.play(b);
	player.handlePlay();

	const declined = player.clearHistory();

	confirmation.answer();
	await declined;
	expect(player.playHistory.map((e) => e.id)).toEqual(['b', 'a']);

	const confirmed = player.clearHistory();

	confirmation.answer('primary');
	await confirmed;
	await settle();
	expect(player.playHistory).toEqual([]);
	expect(stored.get('history')).toEqual([]);

	await player.previous();
	expect(player.episode?.id).toBe('a');
});

it('removes one history entry only once confirmed, and stores the rest', async () => {
	player.playHistory = [a, b, c];

	const declined = player.removeFromHistory(b);

	confirmation.answer();
	await declined;
	expect(player.playHistory.map((e) => e.id)).toEqual(['a', 'b', 'c']);

	const confirmed = player.removeFromHistory(b);

	confirmation.answer('primary');
	await confirmed;
	await settle();
	expect(player.playHistory.map((e) => e.id)).toEqual(['a', 'c']);
	expect((stored.get('history') as Episode[]).map((e) => e.id)).toEqual(['a', 'c']);
});

it('loves and unloves the episode, sending only the love to Last.fm', async () => {
	await player.play(c);

	await player.toggleLove();
	expect(player.loved).toBe(true);
	expect(stored.get('loved')).toEqual(['c']);
	expect(player.lovedIds).toEqual(['c']);

	await player.toggleLove();
	expect(player.loved).toBe(false);
	expect(stored.get('loved')).toEqual([]);
	expect(player.lovedIds).toEqual([]);
	expect(calls.filter(([command]) => command === 'love')).toHaveLength(1);
});

it('loves and unloves an episode that isn’t loaded, which the player then reflects', async () => {
	await player.play(c);

	await player.toggleLove(a);
	expect(player.lovedIds).toEqual(['a']);
	expect(stored.get('loved')).toEqual(['a']);
	expect(calls).toContainEqual(['love', { episode: a }]);
	expect(player.loved).toBe(false);

	await player.play(a);
	expect(player.loved).toBe(true);

	await player.toggleLove(a);
	expect(player.loved).toBe(false);
	expect(stored.get('loved')).toEqual([]);
	expect(calls.filter(([command]) => command === 'love')).toHaveLength(1);
});

it('keeps each listened episode once in the history, latest first, and stores it', async () => {
	player.playHistory = [];
	await player.play(a);
	player.handlePlay();
	player.pause();
	player.handlePlay();
	await player.play(b);
	player.handlePlay();
	await player.play(a);
	player.handlePlay();
	await settle();

	expect(player.playHistory.map((e) => e.id)).toEqual(['a', 'b']);
	expect((stored.get('history') as Episode[]).map((e) => e.id)).toEqual(['a', 'b']);
});

it('empties the player when the last episode ends, only if the setting is on', async () => {
	player.playQueue = [];
	await player.play(a);

	player.handleEnded();
	expect(player.episode?.id).toBe('a');

	settings.stored.clearPlayer = true;
	player.handleEnded();
	await settle();

	expect(player.episode).toBeNull();
	expect(stored.get('lastPlayed')).toBeNull();
	settings.stored.clearPlayer = false;
});

describe('a downloaded episode', () => {
	beforeEach(() => {
		files.set('a', '/downloads/a.mp3');
	});

	afterEach(() => {
		files.clear();
	});

	it('plays from its file, and an episode that is not downloaded streams', async () => {
		await player.play(a);

		expect(player.src).toBe('asset:///downloads/a.mp3');

		await player.play(b);

		expect(player.src).toBe('b.mp3');
	});

	it('streams once its file is gone', async () => {
		await player.play(a);
		files.clear();
		await player.play(a);

		expect(player.src).toBe('a.mp3');
	});

	it('switches to the stream at the same position when its file fails, without a recheck', async () => {
		await player.play(a);

		const audio = { currentTime: 42, readyState: 4, ended: false } as HTMLAudioElement;

		player.audio = audio;
		player.handleError();
		flushSync();

		expect(player.src).toBe('a.mp3');
		expect(calls.some(([command]) => command === 'recheck_mp3')).toBe(false);

		audio.currentTime = 0;
		player.handleLoadedMetadata();
		player.audio = undefined;

		expect(audio.currentTime).toBe(42);
		await settle();
		expect(stored.get('position')).toBe(42);
	});

	it('rechecks the mp3 when the stream fails', async () => {
		await player.play(b);
		player.handleError();

		expect(calls).toContainEqual(['recheck_mp3', { id: 'b' }]);
	});
});

describe('PLAY while another episode plays', () => {
	beforeEach(async () => {
		player.playQueue = [];
		await player.play(a);
		player.paused = false;
	});

	afterEach(() => {
		settings.stored.playBehaviour = 'ask';
	});

	it('plays it when set to always play, leaving the queue', async () => {
		settings.stored.playBehaviour = 'play';
		player.playQueue = [c];
		await player.playOrQueue(b);

		expect(player.episode?.id).toBe('b');
		expect(player.playQueue.map((e) => e.id)).toEqual(['c']);
	});

	it('queues it when set to always queue', async () => {
		settings.stored.playBehaviour = 'queue';
		await player.playOrQueue(b);

		expect(player.episode?.id).toBe('a');
		expect(player.playQueue.map((e) => e.id)).toEqual(['b']);
	});

	it('asks when set to always ask, defaulting to QUEUE', async () => {
		const asked = player.playOrQueue(b);

		expect(confirmation.question?.primaryAction).toBe('Play');
		expect(confirmation.question?.secondaryAction).toBe('Queue');

		confirmation.answer('secondary');
		await asked;

		expect(player.episode?.id).toBe('a');
		expect(player.playQueue.map((e) => e.id)).toEqual(['b']);
	});

	it('plays it once asked and PLAY is chosen', async () => {
		const asked = player.playOrQueue(b);

		confirmation.answer('primary');
		await asked;

		expect(player.episode?.id).toBe('b');
		expect(player.playQueue).toEqual([]);
	});

	it('does nothing once asked and dismissed', async () => {
		const asked = player.playOrQueue(b);

		confirmation.answer();
		await asked;

		expect(player.episode?.id).toBe('a');
		expect(player.playQueue).toEqual([]);
	});

	it('just plays the episode already playing, without asking', async () => {
		await player.playOrQueue(a);

		expect(confirmation.question).toBeNull();
		expect(player.episode?.id).toBe('a');
		expect(player.playQueue).toEqual([]);
	});

	it('just plays when nothing is playing, whatever the setting', async () => {
		settings.stored.playBehaviour = 'queue';
		player.paused = true;
		await player.playOrQueue(b);

		expect(player.episode?.id).toBe('b');
		expect(player.playQueue).toEqual([]);
	});
});

describe('counting plays', () => {
	/** Ten minutes long, so a play counts after one minute heard. */
	let audio: HTMLAudioElement;

	/** Plays on from the playhead for `seconds`, in the half-second steps of `timeupdate`. */
	function listenFor(seconds: number) {
		for (let heard = 0; heard < seconds; heard += 0.5) {
			audio.currentTime += 0.5;
			player.handleTimeUpdate();
		}
	}

	beforeEach(async () => {
		player.reset();
		player.plays = {};
		await player.play(a);

		audio = {
			currentTime: 0,
			duration: 600,
			paused: false,
			seeking: false,
			readyState: 4,
			ended: false,
		} as HTMLAudioElement;
		player.audio = audio;
	});

	afterEach(() => {
		player.audio = undefined;
	});

	it('adds one play once enough has been heard, and saves it', async () => {
		listenFor(59);

		expect(player.plays.a).toBeUndefined();

		listenFor(2);

		expect(player.plays.a).toBe(1);
		await settle();
		expect(stored.get('plays')).toEqual({ a: 1 });
	});

	it('counts nothing for seeking past the threshold', () => {
		audio.currentTime = 300;
		player.handleTimeUpdate();
		listenFor(10);

		expect(player.plays.a).toBeUndefined();
	});

	it('counts a later listen of the same episode again', async () => {
		listenFor(61);

		player.audio = undefined;
		await player.play(b);
		await player.play(a);
		audio.currentTime = 0;
		player.audio = audio;

		listenFor(61);

		expect(player.plays.a).toBe(2);
	});
});
