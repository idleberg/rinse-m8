/// <reference types="bun" />

import { expect, test as it, mock } from 'bun:test';

let approvedAs: string | null = 'dj';

mock.module('@tauri-apps/api/core', () => ({
	invoke: async (command: string) => {
		if (command === 'get_lastfm') {
			return { user: null };
		}

		if (command === 'connect_lastfm') {
			return approvedAs;
		}
	},
}));

let sendDisconnected = () => {};

mock.module('@tauri-apps/api/event', () => ({
	listen: async (event: string, handler: () => void) => {
		if (event === 'lastfm-disconnected') {
			sendDisconnected = handler;
		}
	},
}));

const { lastfm } = await import('./lastfm.svelte');
const { confirmation } = await import('./confirm.svelte');

lastfm.init();

it('stays disconnected when connecting is cancelled', async () => {
	approvedAs = null;
	await lastfm.connect();
	expect(lastfm.account).toEqual({ user: null });
	expect(lastfm.connecting).toBe(false);
});

it('connects as the user who approved', async () => {
	approvedAs = 'dj';

	const connected = lastfm.connect();

	expect(lastfm.connecting).toBe(true);
	await connected;
	expect(lastfm.account).toEqual({ user: 'dj' });
	expect(lastfm.connecting).toBe(false);
});

it('disconnects once confirmed', async () => {
	const disconnected = lastfm.disconnect();

	expect(confirmation.question?.message).toBe('Disconnect dj from Last.fm?');
	confirmation.answer(true);
	await disconnected;
	expect(lastfm.account).toEqual({ user: null });
});

it('disconnects when Last.fm rejects the session', async () => {
	await lastfm.connect();
	sendDisconnected();
	expect(lastfm.account).toEqual({ user: null });
});
