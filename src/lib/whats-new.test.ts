/// <reference types="bun" />

import { expect, test as it } from 'bun:test';
import { pickNotes, seenVersion } from './whats-new';

it('picks nothing on a fresh install, with no seen version', () => {
	expect(pickNotes(null, '1.1.0', ['1.1.0'])).toBeUndefined();
});

it('picks nothing after a patch update without notes of its own', () => {
	expect(pickNotes('0.23.0', '0.23.2', ['0.22.0', '0.23.0'])).toBeUndefined();
});

it('picks the newest notes in range', () => {
	expect(pickNotes('0.21.0', '0.23.2', ['0.21.0', '0.22.0', '0.23.0'])).toBe('0.23.0');
});

it('ignores notes newer than the current version', () => {
	expect(pickNotes('0.21.0', '0.23.2', ['0.22.0', '0.24.0'])).toBe('0.22.0');
});

it('compares versions by number', () => {
	expect(pickNotes('0.9.0', '0.10.0', ['0.9.5', '0.10.0'])).toBe('0.10.0');
	expect(pickNotes('0.10.0', '0.10.1', ['0.9.5'])).toBeUndefined();
});

it('picks notes up to the current version after an update from an unknown version', () => {
	expect(pickNotes('', '0.23.2', ['0.1.0', '0.23.0', '0.24.0'])).toBe('0.23.0');
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
