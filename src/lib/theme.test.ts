/// <reference types="bun" />

import { expect, test as it, mock } from 'bun:test';

// A custom theme whose folder was deleted since it was picked
const local = new Map<string, string>([
	['skin', 'custom:removed'],
	['skin-href', 'asset://localhost/%2Fconfig/themes/removed/theme.css'],
]);

globalThis.localStorage = {
	getItem: (key: string) => local.get(key) ?? null,
	setItem: (key: string, value: string) => {
		local.set(key, value);
	},
	removeItem: (key: string) => {
		local.delete(key);
	},
} as unknown as Storage;

/** A custom theme in a folder named like a built-in theme, three that extend one, the second with a typo, and one whose
 * `theme.css` can't be read. */
const customThemes = {
	themes: [
		{ id: 'dusk', name: 'Dusk', extends: 'graphix', path: '/config/themes/dusk/theme.css' },
		{ id: 'graphix', name: 'Solarized', extends: null, path: '/config/themes/graphix/theme.css' },
		{ id: 'typo', name: 'Typo', extends: 'grafix', path: '/config/themes/typo/theme.css' },
		{ id: 'warm', name: 'Warm', extends: 'asciitron', path: '/config/themes/warm/theme.css' },
	],
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

// The link app.html adds for the stored custom theme before the app starts
const startup = document.createElement('link');

startup.id = 'custom-theme';
startup.href = local.get('skin-href') ?? '';
document.body.append(startup);

const { theme } = await import('./theme.svelte');
const { errors } = await import('./errors.svelte');

it('loads a stored custom theme missing from the list as Graphix', async () => {
	expect(theme.current).toBe('custom:removed');

	await theme.load();
	expect(theme.current).toBe('graphix');
	expect(root.dataset.skin).toBe('graphix');
	expect(local.get('skin')).toBe('graphix');
	expect(local.has('skin-href')).toBe(false);
	expect(body).toEqual([]);
});

it('lists the custom themes and reports the ones that cannot be read', () => {
	expect(theme.custom.map((custom) => custom.name)).toEqual(['Dusk', 'Solarized', 'Typo', 'Warm']);
	expect(errors.message).toBe('Reading themes/broken/theme.css failed');
});

it('sets the root attribute and stores Asciitron', () => {
	theme.pick('asciitron');
	expect(theme.current).toBe('asciitron');
	expect(root.dataset.skin).toBe('asciitron');
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
	const [, custom] = theme.custom;

	theme.pick(custom.value);
	expect(theme.current).toBe(custom.value);
	expect(root.dataset.skin).toBeUndefined();
	expect(local.get('skin')).toBe(custom.value);
	expect(local.get('skin-href')).toBe('asset://localhost/%2Fconfig/themes/graphix/theme.css');

	// Separators after the root stay slashes, so relative url()s resolve in the theme's folder
	expect(body).toEqual([
		expect.objectContaining({ href: 'asset://localhost/%2Fconfig/themes/graphix/theme.css' }),
	]);
});

it('sets the extended theme as the root attribute and stores it', () => {
	theme.pick('custom:dusk');
	expect(root.dataset.skin).toBe('graphix');
	expect(local.get('skin-extends')).toBe('graphix');
	expect(body).toEqual([
		expect.objectContaining({ href: 'asset://localhost/%2Fconfig/themes/dusk/theme.css' }),
	]);
});

it('sets Asciitron as the root attribute for a theme that extends it', () => {
	theme.pick('custom:warm');
	expect(root.dataset.skin).toBe('asciitron');
	expect(local.get('skin-extends')).toBe('asciitron');
});

it('ignores an @extends that is not a built-in theme', () => {
	theme.pick('custom:dusk');
	theme.pick('custom:typo');
	expect(root.dataset.skin).toBeUndefined();
	expect(local.has('skin-extends')).toBe(false);
});

it('removes the custom theme link when a built-in theme is picked', () => {
	theme.pick('custom:dusk');
	theme.pick('graphix');
	expect(root.dataset.skin).toBe('graphix');
	expect(local.has('skin-href')).toBe(false);
	expect(local.has('skin-extends')).toBe(false);
	expect(body).toEqual([]);
});
