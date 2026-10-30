export type Episode = {
	id: string;
	title: string;
	showId: string;
	showSlug: string;
	showTitle: string;
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
};

export type Show = { slug: string; title: string };

/** A show in the show directory. `station` is empty for a show without a channel. */
export type DirectoryShow = Show & { station: string; genres: string[] };

/** What Rinse says about a show besides its episodes. */
export type ShowDetails = {
	image: string | null;
	/** HTML from Rinse; render it through `paragraphs`, never as markup. */
	description: string | null;
};

/** A show's details with the episode cache, as `refresh_show` returns them. */
export type ShowPage = { details: ShowDetails; episodes: Episode[] };

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
		.split(/\n\s*\n/)
		.map((text) => text.trim())
		.filter(Boolean);
}

export function showOf(episode: Episode): Show {
	return { slug: episode.showSlug, title: episode.showTitle };
}

export const stations = ['Rinse FM', 'Rinse FR', 'Kool FM', 'SWU FM'];

/** The backend's download queue, as sent with every `download-queue` event. */
export type DownloadQueue = {
	current: Episode | null;
	/** Of `current`, once the server has reported a size. */
	percent: number | null;
	waiting: Episode[];
	/** The last download that failed, until the next one starts or it's dismissed. */
	failed: Episode | null;
	/** Ids of every episode the app has finished downloading. */
	downloaded: string[];
};

export type SortColumn = 'date' | 'station' | 'show' | 'title';

export type Sort = { column: SortColumn; ascending: boolean };

/** Newest first. */
export const defaultSort: Sort = { column: 'date', ascending: false };

const sortKeys: Record<SortColumn, (episode: Episode) => string> = {
	date: (episode) => `${episode.date} ${episode.time}`,
	station: (episode) => episode.station,
	show: (episode) => episode.showTitle,
	title: (episode) => episode.title,
};

/** A sorted copy of `episodes`. Ties keep their order in `episodes`. */
export function sortEpisodes(episodes: Episode[], sort: Sort): Episode[] {
	const key = sortKeys[sort.column];
	const direction = sort.ascending ? 1 : -1;

	return episodes.toSorted((a, b) => direction * key(a).localeCompare(key(b)));
}

/** The sort after clicking `column`: the same column reverses, another one ascends. */
export function toggleSort(sort: Sort, column: SortColumn): Sort {
	return sort.column === column ? { column, ascending: !sort.ascending } : { column, ascending: true };
}

/** `YYYY-MM-DD` as `YYYY/MM/DD`. */
export function formatDate(date: string): string {
	return date.replaceAll('-', '/');
}

/** `<Show> – <YYYY/MM/DD>`. */
export function episodeLabel(episode: Episode): string {
	return `${episode.showTitle} – ${formatDate(episode.date)}`;
}
