/// <reference types="bun" />

import { beforeEach, expect, test as it, jest, mock } from 'bun:test';
import type { DownloadQueue, Episode } from './episodes';

const calls: [string, unknown][] = [];
let failing = '';
const loaded: DownloadQueue = {
	current: null,
	percent: null,
	waiting: [],
	failures: [],
	downloaded: ['x'],
};

mock.module('@tauri-apps/api/core', () => ({
	convertFileSrc: String,
	invoke: async (command: string, args?: unknown) => {
		calls.push([command, args]);

		if (command === failing) {
			throw 'no download folder set';
		}

		return command === 'get_download_queue' ? loaded : undefined;
	},
}));

let sendQueue: (queue: DownloadQueue) => void = () => {};

mock.module('@tauri-apps/api/event', () => ({
	listen: async (event: string, handler: (event: { payload: DownloadQueue }) => void) => {
		if (event === 'download-queue') {
			sendQueue = (payload) => handler({ payload });
		}
	},
}));

let chosenFolder: string | null = null;

mock.module('@tauri-apps/plugin-dialog', () => ({
	open: async () => chosenFolder,
	save: async () => null,
}));

const { downloads } = await import('./downloads.svelte');
const { errors } = await import('./errors.svelte');
const { settings } = await import('./settings.svelte');
const { episodes } = await import('./episodes.svelte');

const episode = { id: 'a' } as Episode;

let queueOpened = false;

downloads.init({
	openQueue: () => {
		queueOpened = true;
	},
});

beforeEach(() => {
	calls.length = 0;
	settings.stored.downloadFolder = '/music';
	chosenFolder = null;
	queueOpened = false;
	failing = '';
});

it('queues nothing when no download folder is chosen', async () => {
	settings.stored.downloadFolder = null;
	await downloads.download(episode);
	expect(calls).not.toContainEqual(['download', { episode }]);
});

it('asks for a download folder first if none is set', async () => {
	settings.stored.downloadFolder = null;
	chosenFolder = '/music';
	await downloads.download(episode);
	expect(calls).toContainEqual(['set_settings', { patch: { downloadFolder: '/music' } }]);
	expect(calls).toContainEqual(['download', { episode }]);
});

it('queues the episode once a folder is set', async () => {
	await downloads.download(episode);
	expect(calls).toContainEqual(['download', { episode }]);
});

it('loads the queue and follows its updates', async () => {
	expect(downloads.queue).toEqual(loaded);

	const updated = { ...loaded, waiting: [episode] };

	sendQueue(updated);
	expect(downloads.queue).toEqual(updated);
});

it('opens the queue view when retrying a failed download', async () => {
	await downloads.download(episode);
	expect(queueOpened).toBe(false);

	sendQueue({ ...loaded, failures: [episode] });
	await downloads.download(episode);
	expect(queueOpened).toBe(true);
});

it('reports a failed command instead of throwing', async () => {
	failing = 'download';
	await downloads.download(episode);
	expect(errors.message).toBe('no download folder set');

	failing = 'cancel_download';
	errors.clear();
	await downloads.cancel();
	expect(errors.message).toBe('no download folder set');
});

it('fakes a running download with moving progress until hidden', () => {
	jest.useFakeTimers();

	const real = downloads.queue;
	const [first, ...rest] = ['f1', 'f2', 'f3', 'f4', 'f5'].map(
		(id) => ({ id, date: '2026-01-01', time: '12:00' }) as Episode,
	);

	episodes.replace([first, ...rest]);
	downloads.fake(true);
	expect(downloads.queue).toEqual({
		...real,
		current: first,
		percent: 0,
		waiting: rest.slice(0, 3),
	});

	jest.advanceTimersByTime(1000);
	expect(downloads.queue.percent).toBe(50);

	// Shown again at once, which mustn't speed up the progress
	downloads.fake(false);
	downloads.fake(true);
	jest.advanceTimersByTime(500);
	expect(downloads.queue.percent).toBe(25);

	downloads.fake(false);
	expect(downloads.queue).toEqual(real);
	jest.useRealTimers();
});

it('lets a real queue update replace the fake', () => {
	jest.useFakeTimers();
	episodes.replace([episode]);
	downloads.fake(true);

	const updated = { ...loaded, waiting: [episode] };

	sendQueue(updated);
	jest.advanceTimersByTime(1000);
	expect(downloads.queue).toEqual(updated);

	downloads.fake(false);
	expect(downloads.queue).toEqual(updated);
	jest.useRealTimers();
});
