/// <reference types="bun" />

import { expect, test as it } from 'bun:test';
import {
	available,
	dead,
	defaultSort,
	type Episode,
	episodeLabel,
	monthsAgo,
	moveItem,
	sortEpisodes,
	sortShows,
	toggleSort,
} from './episodes';

function episode(id: string, date: string, show: string): Episode {
	return {
		id,
		title: id,
		showId: id,
		showSlug: id,
		showTitle: show,
		displayTitle: null,
		station: 'Rinse FM',
		date,
		time: '12:00',
		length: 60,
		rebroadcast: false,
		genres: [],
		mp3: null,
		scheduled: true,
		mp3Found: null,
		image: null,
		showImage: null,
	};
}

const episodes = [
	episode('a', '2026-10-01', 'Beta'),
	episode('b', '2026-10-03', 'Gamma'),
	episode('c', '2026-10-02', 'Alpha'),
];
const ids = (list: Episode[]) => list.map(({ id }) => id);

it('the default order is newest first', () => {
	expect(ids(sortEpisodes(episodes, defaultSort))).toEqual(['b', 'c', 'a']);
});

it('sorting by a column ascends, and sorting by it again reverses', () => {
	const ascending = toggleSort(defaultSort, 'show');

	expect(ids(sortEpisodes(episodes, ascending))).toEqual(['c', 'a', 'b']);
	expect(ids(sortEpisodes(episodes, toggleSort(ascending, 'show')))).toEqual(['b', 'a', 'c']);
});

it('an episode is available unless it has no mp3 or its last check got a 404', () => {
	const mp3 = { ...episode('a', '2026-10-01', 'Beta'), mp3: 'https://replay.rinse.fm/uk/a.mp3' };

	expect(available(mp3)).toBe(true);
	expect(available({ ...mp3, mp3Found: true })).toBe(true);
	expect(available({ ...mp3, mp3Found: false })).toBe(false);
	expect(available(episode('a', '2026-10-01', 'Beta'))).toBe(false);
});

it('a missing episode is dead once it is over a month old', () => {
	const missing = {
		...episode('a', '2026-10-01', 'Beta'),
		mp3: 'https://replay.rinse.fm/uk/a.mp3',
		mp3Found: false,
	};
	const noon = (date: string) => new Date(`${date}T12:00:00Z`);

	expect(dead(missing, noon('2026-10-31'))).toBe(false);
	expect(dead(missing, noon('2026-11-01'))).toBe(true);
	expect(dead({ ...missing, mp3Found: null }, noon('2026-12-01'))).toBe(false);
});

it('moving an item to an index reorders the list, and an out-of-range index changes nothing', () => {
	const list = ['a', 'b', 'c'];

	expect(moveItem(list, 2, 0)).toEqual(['c', 'a', 'b']);
	expect(moveItem(list, 0, 2)).toEqual(['b', 'c', 'a']);
	expect(moveItem(list, 3, 0)).toEqual(list);
	expect(moveItem(list, -1, 0)).toEqual(list);
	expect(moveItem(list, 0, 3)).toEqual(list);
	expect(list).toEqual(['a', 'b', 'c']);
});

it('the label reads show, then subtitle if there is one, then date', () => {
	const plain = episode('a', '2026-10-01', 'Beta');

	expect(episodeLabel(plain)).toBe('Beta – 2026/10/01');
	expect(episodeLabel({ ...plain, displayTitle: 'Guest Mix' })).toBe(
		'Beta – Guest Mix – 2026/10/01',
	);
});

it('sorting shows by last aired starts freshest first, and undated shows stay last either way', () => {
	const show = (slug: string) => ({ slug, title: slug, station: '', genres: [] });
	const shows = [show('undated'), show('old'), show('new'), show('also-undated'), show('also-old')];
	const lastAired = { old: '2026-01-01', new: '2026-05-01', 'also-old': '2026-01-01' };
	const freshest = toggleSort(null, 'lastAired', false);

	expect(sortShows(shows, freshest, lastAired).map((s) => s.slug)).toEqual([
		'new',
		'old',
		'also-old',
		'undated',
		'also-undated',
	]);
	expect(sortShows(shows, toggleSort(freshest, 'lastAired'), lastAired).map((s) => s.slug)).toEqual(
		['old', 'also-old', 'new', 'undated', 'also-undated'],
	);
	expect(sortShows(shows, null, lastAired)).toEqual(shows);
});

it('months ago lands on the same day, or the last day of a shorter month', () => {
	expect(monthsAgo(24, new Date('2026-11-03T12:00:00Z'))).toBe('2024-11-03');
	expect(monthsAgo(6, new Date('2026-08-31T12:00:00Z'))).toBe('2026-02-28');
	expect(monthsAgo(12, new Date('2026-01-15T12:00:00Z'))).toBe('2025-01-15');
});
