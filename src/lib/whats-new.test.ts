/// <reference types="bun" />

import { expect, test as it } from 'bun:test';
import { seenVersion, shouldShow } from './whats-new';

const notes = '<p>New things</p>';

it('hides on a fresh install, with no seen version', () => {
	expect(shouldShow(null, '1.1.0', notes)).toBe(false);
});

it('hides when the seen version is the current one', () => {
	expect(shouldShow('1.1.0', '1.1.0', notes)).toBe(false);
});

it('hides empty or whitespace-only notes', () => {
	expect(shouldShow('1.0.0', '1.1.0', '')).toBe(false);
	expect(shouldShow('1.0.0', '1.1.0', ' \n\t')).toBe(false);
});

it('shows after an update with notes', () => {
	expect(shouldShow('1.0.0', '1.1.0', notes)).toBe(true);
});

it('shows after an update from a version that recorded no seen version', () => {
	expect(shouldShow('', '1.1.0', notes)).toBe(true);
});

const storage = (items: Record<string, string>) => ({
	getItem: (key: string) => items[key] ?? null,
});

it('reads the seen version', () => {
	expect(seenVersion(storage({ seenVersion: '1.0.0', filters: '{}' }))).toBe('1.0.0');
});

it('reads an update from before seen versions as an unknown version', () => {
	expect(seenVersion(storage({ filters: '{}' }))).toBe('');
});

it('reads a fresh install as no seen version', () => {
	expect(seenVersion(storage({}))).toBe(null);
});
