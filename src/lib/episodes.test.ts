/// <reference types="bun" />

import { expect, test } from 'bun:test';
import { type Episode, defaultSort, sortEpisodes, toggleSort } from './episodes';

function episode(id: string, date: string, title: string): Episode {
	return {
		id,
		title,
		showId: id,
		showSlug: id,
		showTitle: id,
		station: 'Rinse FM',
		date,
		time: '12:00',
		length: 60,
		rebroadcast: false,
		genres: [],
		mp3: null,
		scheduled: true,
	};
}

const episodes = [episode('a', '2026-10-01', 'Beta'), episode('b', '2026-10-03', 'Gamma'), episode('c', '2026-10-02', 'Alpha')];
const ids = (list: Episode[]) => list.map((episode) => episode.id);

test('the default order is newest first', () => {
	expect(ids(sortEpisodes(episodes, defaultSort))).toEqual(['b', 'c', 'a']);
});

test('sorting by a column ascends, and sorting by it again reverses', () => {
	const ascending = toggleSort(defaultSort, 'title');

	expect(ids(sortEpisodes(episodes, ascending))).toEqual(['c', 'a', 'b']);
	expect(ids(sortEpisodes(episodes, toggleSort(ascending, 'title')))).toEqual(['b', 'a', 'c']);
});
