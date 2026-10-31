/// <reference types="bun" />

import { expect, test as it } from 'bun:test';
import { heardBetween, scrobbleAfter } from './listen';

it('counts the playhead moving on as heard', () => {
	expect(heardBetween(10, 10.25)).toBe(0.25);
});

it('counts nothing for seeking ahead', () => {
	expect(heardBetween(10, 600)).toBe(0);
});

it('counts nothing for seeking back', () => {
	expect(heardBetween(600, 10)).toBe(0);
});

it('scrobbles a long episode after 4 minutes', () => {
	expect(scrobbleAfter(7200)).toBe(240);
});

it('scrobbles a short episode halfway through', () => {
	expect(scrobbleAfter(300)).toBe(150);
});

it('scrobbles an episode of unknown length after 4 minutes', () => {
	expect(scrobbleAfter(Number.NaN)).toBe(240);
});
