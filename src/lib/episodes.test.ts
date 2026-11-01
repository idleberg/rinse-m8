/// <reference types="bun" />

import { expect, test as it } from 'bun:test';
import {
	available,
	dead,
	defaultSort,
	type Episode,
	moveItem,
	sortEpisodes,
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
