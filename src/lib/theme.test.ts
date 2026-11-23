/// <reference types="bun" />

import { expect, test as it } from 'bun:test';

// A theme removed in an update, still stored from before
const local = new Map<string, string>([['skin', 'removed']]);

globalThis.localStorage = {
	getItem: (key: string) => local.get(key) ?? null,
	setItem: (key: string, value: string) => {
		local.set(key, value);
	},
	removeItem: (key: string) => {
		local.delete(key);
	},
} as unknown as Storage;

const root = { dataset: {} as DOMStringMap };

globalThis.document = { documentElement: root } as unknown as Document;

const { theme } = await import('./theme.svelte');

it('loads an unknown stored theme as Asciitron', () => {
	expect(theme.current).toBe('default');
	expect(root.dataset.skin).toBeUndefined();
});

it('sets the root attribute and stores a picked theme', () => {
	theme.pick('graphics');
	expect(theme.current).toBe('graphics');
	expect(root.dataset.skin).toBe('graphics');
	expect(local.get('skin')).toBe('graphics');
});

it('clears both for Asciitron', () => {
	theme.pick('graphics');
	theme.pick('default');
	expect(theme.current).toBe('default');
	expect(root.dataset.skin).toBeUndefined();
	expect(local.has('skin')).toBe(false);
});
