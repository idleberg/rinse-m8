/// <reference types="bun" />

import { beforeEach, expect, test as it, mock } from 'bun:test';
import type { Choice } from './confirm.svelte';
import type { Show } from './episodes';
import type { AutoDownloads } from './settings.svelte';

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

/** Starts subscribing to the show in the mode and answers the dialog, if one opens. */
async function subscribeIn(mode: AutoDownloads, answer?: Choice) {
	settings.stored.subscriptions = [];
	settings.stored.autoDownloadShows = [];
	settings.stored.autoDownloads = mode;

	const subscribing = settings.toggle(show);
	const asked = confirmation.question;

	confirmation.answer(answer);
	await subscribing;

	return asked;
}

it('leaves the show unsubscribed when the subscribe dialog is closed', async () => {
	const asked = await subscribeIn('selected');
	expect(asked?.primaryAction).toBe('Also download');
	expect(asked?.secondaryAction).toBe('Only subscribe');
	expect(settings.subscribed).toEqual([]);
	expect(calls).toEqual([]);
});

it('subscribes without auto-download on ONLY SUBSCRIBE', async () => {
	await subscribeIn('selected', 'secondary');
	expect(settings.subscribed).toEqual(['a']);
	expect(settings.stored.autoDownloadShows).toEqual([]);
});

it('subscribes and enables auto-download on ALSO DOWNLOAD', async () => {
	settings.stored.downloadFolder = '/m';
	await subscribeIn('selected', 'primary');
	expect(settings.subscribed).toEqual(['a']);
	expect(settings.stored.autoDownloadShows).toEqual(['a']);
});

it('still subscribes when the folder dialog after ALSO DOWNLOAD is cancelled', async () => {
	settings.stored.downloadFolder = null;
	chosenFolder = null;
	await subscribeIn('selected', 'primary');
	expect(settings.subscribed).toEqual(['a']);
	expect(settings.stored.autoDownloadShows).toEqual([]);
	expect(calls.map(([command]) => command)).not.toContain('set_auto_download');
});

it('enables auto-download without asking with All subscribed shows', async () => {
	settings.stored.downloadFolder = null;
	const asked = await subscribeIn('all');
	expect(asked).toBeNull();
	expect(settings.subscribed).toEqual(['a']);
	expect(settings.stored.autoDownloadShows).toEqual(['a']);
});

it('subscribes without asking or flagging the show with Off', async () => {
	const asked = await subscribeIn('off');
	expect(asked).toBeNull();
	expect(settings.subscribed).toEqual(['a']);
	expect(calls.map(([command]) => command)).toEqual(['subscribe']);
});

it('subscribes again on undo without asking', async () => {
	settings.stored.autoDownloads = 'selected';
	await settings.toggle(show);
	calls.length = 0;
	await toast.act();
	expect(confirmation.question).toBeNull();
	expect(settings.subscribed).toEqual(['a']);
	expect(calls).toEqual([['subscribe', { slug: 'a', title: 'A' }]]);
});

it('enables a show without asking for a folder when there is a default one', async () => {
	settings.stored.downloadFolder = null;
	settings.stored.autoDownloadShows = [];
	settings.defaultFolder = '/music/Rinse M8';
	chosenFolder = null;
	await settings.setAutoDownload('a', true);
	expect(settings.folder).toBe('/music/Rinse M8');
	expect(settings.stored.autoDownloadShows).toEqual(['a']);
	settings.defaultFolder = null;
});

it('keeps the chosen folder when the reset is cancelled', async () => {
	settings.stored.downloadFolder = '/m';

	const resetting = settings.useDefaultFolder();

	confirmation.answer('secondary');
	await resetting;
	expect(settings.stored.downloadFolder).toBe('/m');
});

it('goes back to the default folder by storing none', async () => {
	settings.stored.downloadFolder = '/m';
	settings.defaultFolder = '/music/Rinse M8';

	const resetting = settings.useDefaultFolder();

	expect(confirmation.question?.title).toBe('Reset Download Folder');
	confirmation.answer('primary');
	await resetting;
	expect(calls).toContainEqual(['set_settings', { patch: { downloadFolder: null } }]);
	expect(settings.stored.downloadFolder).toBeNull();
	expect(settings.folder).toBe('/music/Rinse M8');
	settings.defaultFolder = null;
});
