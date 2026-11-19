/// <reference types="bun" />

import { expect, test as it } from 'bun:test';
import { shouldShow } from './whats-new';

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
