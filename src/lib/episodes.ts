export interface Episode {
	id: string;
	/** The episode's slug on rinse.fm; null for an episode cached before episodes carried it. */
	slug: string | null;
	title: string;
	showId: string;
	showSlug: string;
	showTitle: string;
	/** What sets this episode apart from the show's others, such as a guest or a special. */
	displayTitle: string | null;
	station: string;
	/** London date, `YYYY-MM-DD`. */
	date: string;
	/** London time, `HH:MM`. */
	time: string;
	length: number;
	rebroadcast: boolean;
	genres: string[];
	mp3: string | null;
	/** Whether the episode has ever appeared in the schedule feed. */
	scheduled: boolean;
	/** Whether the last check of `mp3` found it: false for a 404, null until a check gets a 200 or 404. */
	mp3Found: boolean | null;
	/** The episode's own artwork, served through the `image` scheme; null when Rinse sends none. */
	image: string | null;
	/** The show's artwork, served through the `image` scheme; null when Rinse sends none. */
	showImage: string | null;
}

export interface Show {
	slug: string;
	title: string;
}

/** A show in the show directory. `station` is empty for a show without a channel. */
export interface DirectoryShow extends Show {
	station: string;
	genres: string[];
}

/** What Rinse says about a show besides its episodes. */
export interface ShowDetails {
	image: string | null;
	/** HTML from Rinse; render it through `paragraphs`, never as markup. */
	description: string | null;
}

/** A show's details with the episode cache, as `refresh_show` returns them. */
export interface ShowPage {
	details: ShowDetails;
	episodes: Episode[];
}

const blankLine = /\n\s*\n/u;

/** The text of each block in `html`, line breaks kept as `\n`. Parsed into an inert document, so nothing in it runs or loads. */
export function paragraphs(html: string): string[] {
	const doc = new DOMParser().parseFromString(html, 'text/html');

	for (const br of doc.querySelectorAll('br')) {
		br.replaceWith('\n');
	}

	for (const block of doc.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6, blockquote, div')) {
		block.append('\n\n');
	}

	return doc.body.textContent
		.split(blankLine)
		.map((text) => text.trim())
		.filter(Boolean);
}

/** Whether the episode has an mp3 that wasn't missing at its last check. */
export function available(episode: Episode): boolean {
	return episode.mp3 !== null && episode.mp3Found !== false;
}

/** Whether the episode's mp3 is missing and it's over a month old, by when Rinse no longer fixes it. Such an episode is hidden everywhere. */
export function dead(episode: Episode, now = new Date()): boolean {
	return episode.mp3Found === false && episode.date <= monthsAgo(1, now);
}

/** Whether a favourite is dead on FAVS: its mp3 got a 404 and `file`, its download, is missing. Unlike `dead`, age doesn't
 * matter. */
export function deadFav(episode: Episode, file?: string): boolean {
	return !file && episode.mp3Found === false;
}

/** The London date of `now`, as year, month and day numbers. */
function londonDate(now: Date) {
	// en-CA formats as `YYYY-MM-DD`, in London like the episode dates
	return now.toLocaleDateString('en-CA', { timeZone: 'Europe/London' }).split('-').map(Number);
}

/** The London date `months` before `now`, as `YYYY-MM-DD`. */
export function monthsAgo(months: number, now = new Date()): string {
	const [year, month, day] = londonDate(now);

	// Day 0 is the last of the month before, so 31 October goes back to 30 September, as in the backend
	const lastDay = new Date(Date.UTC(year, month - months, 0)).getUTCDate();

	return new Date(Date.UTC(year, month - 1 - months, Math.min(day, lastDay)))
		.toISOString()
		.slice(0, 10);
}

/** The London date `weeks` before `now`, as `YYYY-MM-DD`. */
export function weeksAgo(weeks: number, now = new Date()): string {
	const [year, month, day] = londonDate(now);

	return new Date(Date.UTC(year, month - 1, day - 7 * weeks)).toISOString().slice(0, 10);
}

/** The genre and show dropdown options for `episodes`: every genre once and every show once, each sorted. */
export function favOptions(episodes: Episode[]): { genres: string[]; shows: Show[] } {
	const genres = new Set(episodes.flatMap((episode) => episode.genres));
	const shows = new Map(episodes.map((episode) => [episode.showSlug, showOf(episode)]));

	return {
		genres: [...genres].sort((a, b) => a.localeCompare(b)),
		shows: [...shows.values()].sort((a, b) => a.title.localeCompare(b.title)),
	};
}

/** Whether the episode passes the genre and show dropdowns, where null is "All". An episode without genres only passes
 * "All genres". */
export function matchesFavFilters(
	episode: Episode,
	{ genre, show }: { genre: string | null; show: string | null },
): boolean {
	return (
		(genre === null || episode.genres.includes(genre)) &&
		(show === null || episode.showSlug === show)
	);
}

/** The episode's page on rinse.fm, or its show's page for an episode without a slug. */
export function webPage(episode: Episode): string {
	return episode.slug
		? `https://www.rinse.fm/episodes/${episode.slug}`
		: `https://www.rinse.fm/shows/${episode.showSlug}`;
}

export function showOf(episode: Episode): Show {
	return { slug: episode.showSlug, title: episode.showTitle };
}

export const stations = ['Rinse FM', 'Rinse FR', 'Kool FM', 'SWU FM'];

/** The stations `episodes` air on, each once, in the order they first appear. */
export function stationsOf(episodes: Episode[]): string[] {
	return [...new Set(episodes.map((episode) => episode.station))];
}

/** Whether the episode passes the "download available" and "hide rebroadcasts" checkboxes. */
export function passesCheckboxes(
	episode: Episode,
	{ mp3Only, hideRebroadcasts }: { mp3Only: boolean; hideRebroadcasts: boolean },
): boolean {
	return (!mp3Only || available(episode)) && !(hideRebroadcasts && episode.rebroadcast);
}

/** Whether an episode or show on `station`, described by `texts`, passes the station checkboxes and the search. A station
 * without a checkbox always passes, so it stays visible rather than unreachable. */
export function matchesFilters(
	station: string,
	texts: string[],
	{ shownStations, search }: { shownStations: string[]; search: string },
): boolean {
	const query = search.trim().toLowerCase();

	return (
		(!stations.includes(station) || shownStations.includes(station)) &&
		texts.some((text) => text.toLowerCase().includes(query))
	);
}

/** The backend's download queue, as sent with every `download-queue` event. */
export interface DownloadQueue {
	current: Episode | null;
	/** Of `current`, once the server has reported a size. */
	percent: number | null;
	waiting: Episode[];
	/** Downloads that failed, oldest first, until they're retried or removed. */
	failures: Episode[];
	/** Ids of every episode the app has finished downloading. */
	downloaded: string[];
}

export type SortColumn = 'date' | 'time' | 'station' | 'show' | 'plays';

export interface Sort<C extends string = SortColumn> {
	column: C;
	ascending: boolean;
}

/** Newest first. */
export const defaultSort: Sort = { column: 'date', ascending: false };

const sortKeys: Record<Exclude<SortColumn, 'plays'>, (episode: Episode) => string> = {
	date: (episode) => `${episode.date} ${episode.time}`,
	time: (episode) => episode.time,
	station: (episode) => episode.station,
	show: (episode) => episode.showTitle,
};

/** Most played first. */
export const mostPlayed: Sort = { column: 'plays', ascending: false };

/** A sorted copy of `episodes`. `plays` counts each episode's plays by id, and one without an entry counts as 0. Ties keep
 * their order in `episodes`. */
export function sortEpisodes(
	episodes: Episode[],
	sort: Sort,
	plays: Record<string, number> = {},
): Episode[] {
	const direction = sort.ascending ? 1 : -1;

	if (sort.column === 'plays') {
		const count = (episode: Episode) => plays[episode.id] ?? 0;

		return episodes.toSorted((a, b) => direction * (count(a) - count(b)));
	}

	const key = sortKeys[sort.column];

	return episodes.toSorted((a, b) => direction * key(a).localeCompare(key(b)));
}

/** The sort after clicking `column`: the same column reverses, another one starts `ascending`. */
export function toggleSort<C extends string>(
	sort: Sort<C> | null,
	column: C,
	ascending = true,
): Sort<C> {
	return sort?.column === column ? { column, ascending: !sort.ascending } : { column, ascending };
}

export type ShowSortColumn = 'title' | 'station' | 'lastAired';

/** A sorted copy of `shows`, or `shows` itself in directory order without a sort. A show without a value, such as no date in
 * `lastAired`, sorts last either way. Ties keep their order in `shows`. */
export function sortShows<T extends DirectoryShow>(
	shows: T[],
	sort: Sort<ShowSortColumn> | null,
	lastAired: Record<string, string>,
): T[] {
	if (!sort) {
		return shows;
	}

	const key = (show: T) =>
		sort.column === 'lastAired' ? (lastAired[show.slug] ?? '') : show[sort.column];
	const direction = sort.ascending ? 1 : -1;

	return shows.toSorted(
		(a, b) => Number(!key(a)) - Number(!key(b)) || direction * key(a).localeCompare(key(b)),
	);
}

/** The order of the Dashboard's show sections. */
export type ShowOrder = 'subscribed' | 'alphabetical' | 'lastUpdated';

/** `sections`, which are in subscription order, in `order`. Last updated goes by the newest episode a section shows, and a
 * section without any sorts last. */
export function orderSections<T extends { show: Show; episodes: Episode[] }>(
	sections: T[],
	order: ShowOrder,
): T[] {
	const newest = (section: T) =>
		section.episodes
			.map(sortKeys.date)
			.sort((a, b) => a.localeCompare(b))
			.at(-1) ?? '';

	switch (order) {
		case 'alphabetical':
			return sections.toSorted((a, b) =>
				a.show.title.localeCompare(b.show.title, undefined, { sensitivity: 'base' }),
			);
		case 'lastUpdated':
			return sections.toSorted((a, b) => newest(b).localeCompare(newest(a)));
		default:
			return sections;
	}
}

/** `YYYY-MM-DD` as `YYYY/MM/DD`. */
export function formatDate(date: string): string {
	return date.replaceAll('-', '/');
}

/** `<Show> – <Subtitle> – <YYYY/MM/DD>`, leaving out the subtitle when there is none. */
export function episodeLabel(episode: Episode): string {
	return [episode.showTitle, episode.displayTitle, formatDate(episode.date)]
		.filter(Boolean)
		.join(' – ');
}

/** A copy of `list` with the item at `from` moved to `to`. Either index out of range leaves the order as it was. */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
	if (!(from in list && to in list)) {
		return list.slice();
	}

	return list.toSpliced(from, 1).toSpliced(to, 0, list[from]);
}
