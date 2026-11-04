/// <reference types="bun" />

import { beforeEach, expect, test as it, jest, mock } from 'bun:test';

let checks = 0;
let found: { version: string } | null = null;
let offline = false;

mock.module('@tauri-apps/plugin-updater', () => ({
	check: async () => {
		checks++;

		if (offline) {
			throw new Error('offline');
		}

		return found;
	},
}));

mock.module('@tauri-apps/plugin-process', () => ({ relaunch: async () => {} }));

const { updates } = await import('./updates.svelte');
const { errors } = await import('./errors.svelte');

beforeEach(() => {
	checks = 0;
	found = null;
	offline = false;
});

it('offers a found update', async () => {
	found = { version: '2.0.0' };
	await updates.check();
	expect(updates.available).toEqual({ version: '2.0.0', percent: null });
});

it('keeps a dismissed version hidden on the next check', async () => {
	updates.dismiss();
	expect(updates.available).toBeNull();

	found = { version: '2.0.0' };
	await updates.check();
	expect(updates.available).toBeNull();

	found = { version: '2.0.1' };
	await updates.check();
	expect(updates.available).toEqual({ version: '2.0.1', percent: null });
});

it('stays silent when the check fails', async () => {
	updates.dismiss();
	offline = true;
	await updates.check();
	expect(updates.available).toBeNull();
	expect(errors.message).toBe('');
});

it('locks Check now for a minute after it checks', async () => {
	jest.useFakeTimers();
	updates.checkNow();
	expect(checks).toBe(1);
	expect(updates.cooling).toBe(true);

	jest.advanceTimersByTime(60_000);
	expect(updates.cooling).toBe(false);
	jest.useRealTimers();
});
