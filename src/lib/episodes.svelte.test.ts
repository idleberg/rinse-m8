/// <reference types="bun" />

import { expect, test as it, mock } from 'bun:test';
import type { Episode } from './episodes';

function episode(id: string, date: string, mp3Found: boolean | null = null): Episode {
	return { id, date, time: '12:00', mp3: 'x.mp3', mp3Found } as Episode;
}

// The first fetch never settles, so it can't overwrite what a test sets
mock.module('@tauri-apps/api/core', () => ({
	convertFileSrc: String,
	invoke: () => new Promise(() => {}),
}));

let sendEpisodes: (episodes: Episode[]) => void = () => {};

mock.module('@tauri-apps/api/event', () => ({
	listen: async (_event: string, handler: (event: { payload: Episode[] }) => void) => {
		sendEpisodes = (payload) => handler({ payload });
	},
}));

const { episodes } = await import('./episodes.svelte');

episodes.init();

it('keeps loading until the first fetch settles', () => {
	expect(episodes.loading).toBe(true);
});

it('lists a replaced cache newest first', () => {
	episodes.replace([episode('old', '2026-01-01'), episode('new', '2026-10-01')]);

	expect(episodes.list.map((e) => e.id)).toEqual(['new', 'old']);
});

it('drops dead episodes from an update', () => {
	sendEpisodes([episode('dead', '2020-01-01', false), episode('missing', '2099-01-01', false)]);

	expect(episodes.list.map((e) => e.id)).toEqual(['missing']);
});
