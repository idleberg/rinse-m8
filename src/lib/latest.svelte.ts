import { newestPerShow } from './episodes';
import { episodes } from './episodes.svelte';
import { filters } from './filters.svelte';
import { player } from './player.svelte';
import { settings } from './settings.svelte';

/** The Dashboard's Latest: each subscribed show's newest filtered episode, leaving out seen and old ones unless
 * `showSeen`. Kept apart from the episode cache, which the player imports. */
export function findLatest({ showSeen }: { showSeen: boolean }) {
	return newestPerShow(
		episodes.list.filter(filters.matchesEpisode),
		settings.subscribed,
		(episode) => !showSeen && (player.isSeen(episode) || player.isOld(episode)),
	);
}
