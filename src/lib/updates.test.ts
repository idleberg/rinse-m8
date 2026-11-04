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

let relaunches = 0;

mock.module('@tauri-apps/plugin-process', () => ({
	relaunch: async () => {
		relaunches++;
	},
}));

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

it('fakes an update whose download stops at 100% without relaunching', async () => {
	jest.useFakeTimers();
	updates.fake(true);
	expect(updates.available).toEqual({ version: '9.0.9', percent: null });

	await updates.install();
	jest.advanceTimersByTime(1000);
	expect(updates.available).toEqual({ version: '9.0.9', percent: 50 });

	jest.advanceTimersByTime(5000);
	expect(updates.available).toEqual({ version: '9.0.9', percent: 100 });
	expect(relaunches).toBe(0);
	jest.useRealTimers();
});

it('stops the fake download once the fake is hidden', async () => {
	jest.useFakeTimers();
	updates.fake(true);
	await updates.install();
	jest.advanceTimersByTime(500);

	updates.fake(false);
	expect(updates.available).toBeNull();

	updates.fake(true);
	jest.advanceTimersByTime(1000);
	expect(updates.available).toEqual({ version: '9.0.9', percent: null });
	jest.useRealTimers();
});
