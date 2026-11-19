/// <reference types="bun" />

import { beforeEach, expect, test as it, mock } from 'bun:test';
import type { Show } from './episodes';

const calls: [string, unknown][] = [];
let failing = '';
const show: Show = { slug: 'a', title: 'A' } as Show;

mock.module('@tauri-apps/api/core', () => ({
	convertFileSrc: String,
	invoke: async (command: string, args?: unknown) => {
		calls.push([command, args]);

		if (command === failing) {
			throw 'saving failed';
		}

		if (command === 'subscribe') {
			return { ...settings.stored, subscriptions: [show] };
		}

		if (command === 'unsubscribe') {
			return { ...settings.stored, subscriptions: [] };
		}

		if (command === 'set_auto_download') {
			const { slug, enabled } = args as { slug: string; enabled: boolean };
			const others = settings.stored.autoDownloadShows.filter((s) => s !== slug);

			return { ...settings.stored, autoDownloadShows: enabled ? [...others, slug] : others };
		}
	},
}));

/** What the folder dialog returns: null when cancelled. */
let chosenFolder: string | null = null;

mock.module('@tauri-apps/plugin-dialog', () => ({
	open: () => Promise.resolve(chosenFolder),
	save: () => Promise.resolve(null),
}));

const { settings } = await import('./settings.svelte');
const { confirmation } = await import('./confirm.svelte');
const { errors } = await import('./errors.svelte');
const { toast } = await import('./toast.svelte');

beforeEach(() => {
	calls.length = 0;
	failing = '';
	errors.clear();
});

it('unticks a checkbox again when saving it fails', async () => {
	settings.stored.groupByShow = false;
	failing = 'set_settings';
	await settings.save('groupByShow', true);
	expect(settings.stored.groupByShow).toBe(false);
	expect(errors.message).toBe('saving failed');
});

it('keeps a saved interval', async () => {
	await settings.save('updateInterval', 12);
	expect(settings.stored.updateInterval).toBe(12);
	expect(calls).toContainEqual(['set_settings', { patch: { updateInterval: 12 } }]);
});

it('puts the stored interval back when saving fails', async () => {
	settings.stored.appUpdateInterval = 24;
	failing = 'set_settings';
	await settings.save('appUpdateInterval', 1);
	expect(settings.stored.appUpdateInterval).toBe(24);
	expect(errors.message).toBe('saving failed');
});

it('subscribes without asking', async () => {
	await settings.toggle(show);
	expect(settings.subscribed).toEqual(['a']);
});

it('unsubscribes without asking and offers to undo it', async () => {
	await settings.toggle(show);
	expect(confirmation.question).toBeNull();
	expect(settings.subscribed).toEqual([]);
	expect(settings.subscribing).toEqual([]);
	expect(toast.message).toBe('You unsubscribed from A');
	expect(toast.action?.label).toBe('Undo');
});

it('subscribes again on undo', async () => {
	await toast.act();
	expect(calls).toEqual([['subscribe', { slug: 'a', title: 'A' }]]);
	expect(settings.subscribed).toEqual(['a']);
	expect(toast.message).toBe('');
});

it('reports a failed unsubscribe without a toast', async () => {
	failing = 'unsubscribe';
	await settings.toggle(show);
	expect(settings.subscribed).toEqual(['a']);
	expect(errors.message).toBe('saving failed');
	expect(toast.message).toBe('');
});

it('puts the image style in the image URL, except for the original', async () => {
	await settings.save('imageStyle', 'original');
	expect(settings.styled('image://localhost/a.jpg')).toBe('image://localhost/a.jpg');
	await settings.save('imageStyle', 'grayscale');
	expect(settings.styled('image://localhost/a.jpg')).toBe(
		'image://localhost/a.jpg?style=grayscale',
	);
});

it('keeps a saved show order', async () => {
	await settings.save('showOrder', 'alphabetical');
	expect(settings.stored.showOrder).toBe('alphabetical');
	expect(calls).toContainEqual(['set_settings', { patch: { showOrder: 'alphabetical' } }]);
});

it('keeps a saved auto-downloads choice', async () => {
	await settings.save('autoDownloads', 'selected');
	expect(settings.stored.autoDownloads).toBe('selected');
	expect(calls).toContainEqual(['set_settings', { patch: { autoDownloads: 'selected' } }]);
});

it('says why a show cannot be enabled for auto-download', () => {
	settings.stored.subscriptions = [];
	settings.stored.autoDownloads = 'selected';
	expect(settings.autoDownloadBlocked('a')).toBe('Subscribe to the show to auto-download it');

	settings.stored.subscriptions = [show];
	expect(settings.autoDownloadBlocked('a')).toBeUndefined();

	settings.stored.autoDownloads = 'all';
	expect(settings.autoDownloadBlocked('a')).toBe('All subscribed shows auto-download');

	settings.stored.autoDownloads = 'off';
	expect(settings.autoDownloadBlocked('a')).toBe('Auto-download is off in Settings');
});

it('leaves a show disabled when the folder dialog is cancelled', async () => {
	settings.stored.downloadFolder = null;
	settings.stored.autoDownloadShows = [];
	chosenFolder = null;
	await settings.setAutoDownload('a', true);
	expect(settings.stored.autoDownloadShows).toEqual([]);
	expect(calls.map(([command]) => command)).not.toContain('set_auto_download');
});

it('asks for a folder before enabling a show, then disables it again', async () => {
	chosenFolder = '/m';
	await settings.setAutoDownload('a', true);
	expect(settings.stored.downloadFolder).toBe('/m');
	expect(settings.stored.autoDownloadShows).toEqual(['a']);

	await settings.setAutoDownload('a', false);
	expect(settings.stored.autoDownloadShows).toEqual([]);
});
