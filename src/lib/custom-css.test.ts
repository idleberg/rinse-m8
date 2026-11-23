/// <reference types="bun" />

import { beforeEach, expect, test as it, mock } from 'bun:test';

/** What `get_custom_css` returns, or throws when it's an Error. */
let reply: string | null | Error = null;

// Module mocks outlive this file, so it keeps what other tests' imports need
mock.module('@tauri-apps/api/core', () => ({
	convertFileSrc: String,
	invoke: () => (reply instanceof Error ? Promise.reject(reply.message) : Promise.resolve(reply)),
}));

/** The page: the app's styles in the head, then whatever is added to the body. */
const page: { tagName: string; textContent?: string }[] = [];

globalThis.document = {
	createElement: (tagName: string) => ({ tagName: tagName.toUpperCase() }),
	body: {
		append: (element: { tagName: string }) => {
			page.push(element);
		},
	},
} as unknown as Document;

const { loadCustomCss } = await import('./custom-css');
const { errors } = await import('./errors.svelte');

beforeEach(() => {
	page.length = 0;
	page.push({ tagName: 'STYLE', textContent: 'app' });
	errors.clear();
});

it('adds the stylesheet after the existing styles', async () => {
	reply = 'nav { gap: 0 }';
	await loadCustomCss();
	expect(page).toEqual([
		{ tagName: 'STYLE', textContent: 'app' },
		{ tagName: 'STYLE', textContent: 'nav { gap: 0 }' },
	]);
});

it('adds nothing without a file', async () => {
	reply = null;
	await loadCustomCss();
	expect(page).toHaveLength(1);
	expect(errors.message).toBe('');
});

it('reports a file that cannot be read', async () => {
	reply = new Error('Reading custom.css failed');
	await loadCustomCss();
	expect(page).toHaveLength(1);
	expect(errors.message).toBe('Reading custom.css failed');
});
