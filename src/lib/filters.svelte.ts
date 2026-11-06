import {
	type DirectoryShow,
	type Episode,
	matchesFilters,
	passesCheckboxes,
	stations,
} from './episodes';

interface Saved {
	shownStations?: string[];
	mp3Only?: boolean;
	hideRebroadcasts?: boolean;
}

/** The filters every episode list and the show directory share. The checkboxes are remembered across restarts, the
 * search isn't. */
class Filters {
	shownStations = $state([...stations]);
	mp3Only = $state(true);
	hideRebroadcasts = $state(false);
	search = $state('');

	// Arrow functions, so they can be passed as callbacks such as `list.filter(filters.matchesEpisode)`

	matchesEpisode = (episode: Episode) =>
		this.matchesStationsAndSearch(episode) && passesCheckboxes(episode, this);

	/** Leaves out the checkboxes, for views where they don't apply. */
	matchesStationsAndSearch = (episode: Episode) =>
		matchesFilters(
			episode.station,
			[episode.title, episode.showTitle, episode.displayTitle ?? '', ...episode.genres],
			this,
		);

	/** Shows have no mp3 or rebroadcast, so only the stations and search apply. */
	matchesShow = (show: DirectoryShow) =>
		matchesFilters(show.station, [show.title, ...show.genres], this);

	init() {
		let saved: Saved = {};

		try {
			saved = JSON.parse(localStorage.getItem('filters') ?? '{}');
		} catch {
			// Unreadable filters fall back to the defaults
		}

		this.shownStations = saved.shownStations ?? this.shownStations;
		this.mp3Only = saved.mp3Only ?? this.mp3Only;
		this.hideRebroadcasts = saved.hideRebroadcasts ?? this.hideRebroadcasts;

		$effect(() => {
			const { shownStations, mp3Only, hideRebroadcasts } = this;

			localStorage.setItem('filters', JSON.stringify({ shownStations, mp3Only, hideRebroadcasts }));
		});
	}
}

export const filters = new Filters();
