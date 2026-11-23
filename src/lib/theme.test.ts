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

it('loads an unknown stored theme as Graphix', () => {
	expect(theme.current).toBe('graphix');
});

it('clears the root attribute and stores Asciitron', () => {
	theme.pick('asciitron');
	expect(theme.current).toBe('asciitron');
	expect(root.dataset.skin).toBeUndefined();
	expect(local.get('skin')).toBe('asciitron');
});

it('sets the root attribute and stores Graphix, though it is the default', () => {
	theme.pick('asciitron');
	theme.pick('graphix');
	expect(theme.current).toBe('graphix');
	expect(root.dataset.skin).toBe('graphix');
	expect(local.get('skin')).toBe('graphix');
});
