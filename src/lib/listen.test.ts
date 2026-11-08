/// <reference types="bun" />

import { expect, test as it } from 'bun:test';
import {
	countPlayAfter,
	formatTime,
	heardBetween,
	parseVolume,
	scrobbleAfter,
	volumeBars,
	wheelVolume,
} from './listen';

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

it('counts a play of a long episode after 15 minutes', () => {
	expect(countPlayAfter(18_000)).toBe(900);
});

it('counts a play of a short episode after a tenth of it', () => {
	expect(countPlayAfter(3000)).toBe(300);
});

it('counts a play of an episode of unknown length after 15 minutes', () => {
	expect(countPlayAfter(Number.NaN)).toBe(900);
});

it('formats a playhead as hours, minutes and seconds', () => {
	expect(formatTime(3725.9)).toBe('1:02:05');
});

it('restores a stored volume', () => {
	expect(parseVolume('0.4')).toBe(0.4);
});

it('restores full volume when none is stored, or the stored one is invalid', () => {
	expect(parseVolume(null)).toBe(1);
	expect(parseVolume('loud')).toBe(1);
	expect(parseVolume('1.5')).toBe(1);
	expect(parseVolume('-0.1')).toBe(1);
});

it('fills one icon bar per third of the volume, and none when muted', () => {
	expect(volumeBars(0)).toBe(0);
	expect(volumeBars(0.01)).toBe(1);
	expect(volumeBars(0.33)).toBe(1);
	expect(volumeBars(0.34)).toBe(2);
	expect(volumeBars(0.66)).toBe(2);
	expect(volumeBars(0.67)).toBe(3);
	expect(volumeBars(1)).toBe(3);
});

it('turns the volume up 5% per wheel notch scrolled up, and down per notch scrolled down', () => {
	expect(wheelVolume(0.5, -100)).toBeCloseTo(0.55);
	expect(wheelVolume(0.5, 100)).toBeCloseTo(0.45);
	expect(wheelVolume(0.5, -10)).toBeCloseTo(0.505);
});

it('keeps a wheeled volume between muted and full', () => {
	expect(wheelVolume(0.98, -100)).toBe(1);
	expect(wheelVolume(0.02, 100)).toBe(0);
});
