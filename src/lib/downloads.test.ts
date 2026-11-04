/// <reference types="bun" />

import { beforeEach, expect, test as it, mock } from 'bun:test';
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
}));

const { downloads } = await import('./downloads.svelte');
const { errors } = await import('./errors.svelte');
const { settings } = await import('./settings.svelte');

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
