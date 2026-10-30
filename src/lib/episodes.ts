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
};

export type Show = { slug: string; title: string };

export function showOf(episode: Episode): Show {
	return { slug: episode.showSlug, title: episode.showTitle };
}

export const stations = ['Rinse FM', 'Rinse FR', 'Kool FM', 'SWU FM'];
