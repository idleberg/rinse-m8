export interface Episode {
	id: string;
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
	// en-CA formats as `YYYY-MM-DD`, in London like the episode dates
	const [year, month, day] = now
		.toLocaleDateString('en-CA', { timeZone: 'Europe/London' })
		.split('-')
		.map(Number);

	// Day 0 is the last of the month before, so 31 October goes back to 30 September, as in the backend
	const lastDay = new Date(Date.UTC(year, month - 1, 0)).getUTCDate();
	const cutoff = new Date(Date.UTC(year, month - 2, Math.min(day, lastDay)))
		.toISOString()
		.slice(0, 10);

	return episode.mp3Found === false && episode.date <= cutoff;
}

export function showOf(episode: Episode): Show {
	return { slug: episode.showSlug, title: episode.showTitle };
}

export const stations = ['Rinse FM', 'Rinse FR', 'Kool FM', 'SWU FM'];

/** The backend's download queue, as sent with every `download-queue` event. */
export interface DownloadQueue {
	current: Episode | null;
	/** Of `current`, once the server has reported a size. */
	percent: number | null;
	waiting: Episode[];
	/** The last download that failed, until the next one starts or it's dismissed. */
	failed: Episode | null;
	/** Ids of every episode the app has finished downloading. */
	downloaded: string[];
}

export type SortColumn = 'date' | 'time' | 'station' | 'show';

export interface Sort {
	column: SortColumn;
	ascending: boolean;
}

/** Newest first. */
export const defaultSort: Sort = { column: 'date', ascending: false };

const sortKeys: Record<SortColumn, (episode: Episode) => string> = {
	date: (episode) => `${episode.date} ${episode.time}`,
	time: (episode) => episode.time,
	station: (episode) => episode.station,
	show: (episode) => episode.showTitle,
};

/** A sorted copy of `episodes`. Ties keep their order in `episodes`. */
export function sortEpisodes(episodes: Episode[], sort: Sort): Episode[] {
	const key = sortKeys[sort.column];
	const direction = sort.ascending ? 1 : -1;

	return episodes.toSorted((a, b) => direction * key(a).localeCompare(key(b)));
}

/** The sort after clicking `column`: the same column reverses, another one ascends. */
export function toggleSort(sort: Sort, column: SortColumn): Sort {
	return sort.column === column
		? { column, ascending: !sort.ascending }
		: { column, ascending: true };
}

/** `YYYY-MM-DD` as `YYYY/MM/DD`. */
export function formatDate(date: string): string {
	return date.replaceAll('-', '/');
}

/** `<Show> – <YYYY/MM/DD>`. */
export function episodeLabel(episode: Episode): string {
	return `${episode.showTitle} – ${formatDate(episode.date)}`;
}

/** A copy of `list` with the item at `from` moved to `to`. Either index out of range leaves the order as it was. */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
	if (!(from in list && to in list)) {
		return list.slice();
	}

	return list.toSpliced(from, 1).toSpliced(to, 0, list[from]);
}
