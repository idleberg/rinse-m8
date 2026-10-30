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
};

/** `<Show> – <dd/mm>`. */
export function episodeLabel(episode: Episode): string {
	const [, month, day] = episode.date.split('-');

	return `${episode.showTitle} – ${day}/${month}`;
}
