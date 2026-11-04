import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { dead, type Episode } from './episodes';
import { errors } from './errors.svelte';

/** The episode cache, kept in step with the poller's `episodes-updated` updates. */
class Episodes {
	/** Newest first, without dead episodes, so no table shows them whatever the filters. */
	list = $state<Episode[]>([]);
	/** True until the first fetch settles, so an empty list isn't mistaken for filtered out. */
	loading = $state(true);

	/** Replaces the whole list, as every source sends the whole cache. An arrow function, so it can be passed as
	 * `.then(episodes.replace)`. */
	replace = (list: Episode[]) => {
		this.list = list
			.filter((episode) => !dead(episode))
			.sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
	};

	init() {
		invoke<Episode[]>('get_episodes')
			.then(this.replace)
			.catch(errors.report)
			.finally(() => {
				this.loading = false;
			});

		// The poller sends the whole cache after each update
		listen<Episode[]>('episodes-updated', (event) => this.replace(event.payload)).catch(
			errors.report,
		);
	}
}

export const episodes = new Episodes();
