import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { dead, type Episode } from './episodes';
import { errors } from './errors.svelte';

/** The episode cache, kept in step with the poller's `episodes-updated` updates. */
class Episodes {
	/** The whole cache, newest first, dead episodes included. For FAVS, which has its own rule for dead, and the player,
	 * which can play a dead favourite's download. */
	all = $state<Episode[]>([]);
	/** `all` without dead episodes, so no other table shows them whatever the filters. */
	list = $derived(this.all.filter((episode) => !dead(episode)));
	/** True until the first fetch settles, so an empty list isn't mistaken for filtered out. */
	loading = $state(true);

	/** Replaces the whole list, as every source sends the whole cache. An arrow function, so it can be passed as
	 * `.then(episodes.replace)`. */
	replace = (list: Episode[]) => {
		this.all = list.toSorted((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
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
