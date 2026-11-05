/// <reference types="bun" />

import { beforeEach, expect, test as it, mock } from 'bun:test';
import type { Show } from './episodes';

const calls: [string, unknown][] = [];
let failing = '';
const show: Show = { slug: 'a', title: 'A' } as Show;

mock.module('@tauri-apps/api/core', () => ({
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
	},
}));

const { settings } = await import('./settings.svelte');
const { confirmation } = await import('./confirm.svelte');
const { errors } = await import('./errors.svelte');

beforeEach(() => {
	calls.length = 0;
	failing = '';
	errors.clear();
});

it('unticks a checkbox again when saving it fails', async () => {
	settings.stored.autoDownload = false;
	failing = 'set_settings';
	await settings.save('autoDownload', true);
	expect(settings.stored.autoDownload).toBe(false);
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

it('keeps the subscription when unsubscribing is declined', async () => {
	const toggled = settings.toggle(show);

	expect(confirmation.question?.title).toBe('Unsubscribe');
	confirmation.answer(false);
	await toggled;
	expect(settings.subscribed).toEqual(['a']);
	expect(calls).toEqual([]);
});

it('unsubscribes once confirmed', async () => {
	const toggled = settings.toggle(show);

	expect(settings.subscribing).toEqual([]);
	confirmation.answer(true);
	await toggled;
	expect(settings.subscribed).toEqual([]);
	expect(settings.subscribing).toEqual([]);
});

it('puts the image style in the image URL, except for the original', async () => {
	await settings.save('imageStyle', 'original');
	expect(settings.styled('image://localhost/a.jpg')).toBe('image://localhost/a.jpg');
	await settings.save('imageStyle', 'grayscale');
	expect(settings.styled('image://localhost/a.jpg')).toBe(
		'image://localhost/a.jpg?style=grayscale',
	);
});
