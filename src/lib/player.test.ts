/// <reference types="bun" />

import { beforeEach, expect, test as it, mock } from 'bun:test';
import type { Episode } from './episodes';

function episode(id: string): Episode {
	return { id, date: '2026-01-01', time: '12:00', mp3: `${id}.mp3` } as Episode;
}

const a = episode('a');
const b = episode('b');
const c = episode('c');

const calls: [string, unknown][] = [];
const stored = new Map<string, unknown>([
	['lastPlayed', 'b'],
	['queue', [c]],
]);

mock.module('@tauri-apps/api/core', () => ({
	invoke: async (command: string, args?: unknown) => {
		calls.push([command, args]);
	},
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

const local = new Map<string, string>();

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

it('brings back the last-played episode and the stored queue at launch', async () => {
	await settle();
	flushSync();

	expect(player.episode?.id).toBe('b');
	expect(player.queue.map((e) => e.id)).toEqual(['c']);
});

it('plays the first queued episode on NEXT, and under repeat all queues the current one last', async () => {
	await player.play(a);
	player.queue = [b, c];
	player.repeat = 'all';

	await player.skip();

	expect(player.episode?.id).toBe('b');
	expect(player.queue.map((e) => e.id)).toEqual(['c', 'a']);
});

it('goes back to the episode played before on PREV, and queues the current one first', async () => {
	player.queue = [];
	await player.play(a);
	player.handlePlay();
	await player.play(b);

	await player.previous();

	expect(player.episode?.id).toBe('a');
	expect(player.queue.map((e) => e.id)).toEqual(['b']);
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
	player.queue = [];
	await player.enqueue(a);
	await player.enqueue(b);
	await player.enqueue(c);
	player.move(2, 0);
	player.dequeue(1);
	await settle();

	expect((stored.get('queue') as Episode[]).map((e) => e.id)).toEqual(['c', 'b']);
});

it('clears the play queue only once confirmed', async () => {
	player.queue = [a];

	const declined = player.clearQueue();

	confirmation.answer(false);
	await declined;
	expect(player.queue).toHaveLength(1);

	const confirmed = player.clearQueue();

	confirmation.answer(true);
	await confirmed;
	await settle();
	expect(player.queue).toEqual([]);
	expect(stored.get('queue')).toEqual([]);
});

it('loves and unloves the episode, sending only the love to Last.fm', async () => {
	await player.play(c);

	await player.toggleLove();
	expect(player.loved).toBe(true);
	expect(stored.get('loved')).toEqual(['c']);

	await player.toggleLove();
	expect(player.loved).toBe(false);
	expect(stored.get('loved')).toEqual([]);
	expect(calls.filter(([command]) => command === 'love')).toHaveLength(1);
});
