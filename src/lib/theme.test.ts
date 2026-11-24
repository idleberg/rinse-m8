/// <reference types="bun" />

import { beforeAll, expect, test as it, mock } from 'bun:test';

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

/** A custom theme in a folder named like a built-in theme, and one whose `theme.css` can't be read. */
const customThemes = {
	themes: [{ id: 'graphix', name: 'Solarized', path: '/config/themes/graphix/theme.css' }],
	failures: ['Reading themes/broken/theme.css failed'],
};

// Module mocks outlive this file, so it keeps what other tests' imports need
mock.module('@tauri-apps/api/core', () => ({
	convertFileSrc: (path: string) => `asset://localhost/${encodeURIComponent(path)}`,
	invoke: () => Promise.resolve(customThemes),
}));

interface Element {
	id?: string;
	href?: string;
	remove: () => void;
}

const root = { dataset: {} as DOMStringMap };

/** What the page adds to the body. */
const body: Element[] = [];

globalThis.document = {
	documentElement: root,
	createElement: () => {
		const element: Element = { remove: () => body.splice(body.indexOf(element), 1) };

		return element;
	},
	querySelector: (selector: string) =>
		body.find((element) => `#${element.id}` === selector) ?? null,
	body: { append: (element: Element) => body.push(element) },
} as unknown as Document;

const { theme } = await import('./theme.svelte');
const { errors } = await import('./errors.svelte');

beforeAll(() => theme.load());

it('loads an unknown stored theme as Graphix', () => {
	expect(theme.current).toBe('graphix');
});

it('lists the custom themes and reports the ones that cannot be read', () => {
	expect(theme.custom.map((custom) => custom.name)).toEqual(['Solarized']);
	expect(errors.message).toBe('Reading themes/broken/theme.css failed');
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

it('clears the root attribute for a custom theme, links its stylesheet and stores the pick', () => {
	const [custom] = theme.custom;

	theme.pick(custom.value);
	expect(theme.current).toBe(custom.value);
	expect(root.dataset.skin).toBeUndefined();
	expect(local.get('skin')).toBe(custom.value);

	// Separators after the root stay slashes, so relative url()s resolve in the theme's folder
	expect(body).toEqual([
		expect.objectContaining({ href: 'asset://localhost/%2Fconfig/themes/graphix/theme.css' }),
	]);
});

it('removes the custom theme link when a built-in theme is picked', () => {
	theme.pick(theme.custom[0].value);
	theme.pick('graphix');
	expect(root.dataset.skin).toBe('graphix');
	expect(body).toEqual([]);
});
