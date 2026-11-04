import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { DirectoryShow } from './episodes';
import { errors } from './errors.svelte';

/** The show directory, kept in step with the background refresh, and when each show last aired. */
class Directory {
	/** Null until the first refresh finishes. */
	shows = $state<DirectoryShow[] | null>(null);
	/** Keyed by show slug. */
	lastAired = $state<Record<string, string>>({});

	/** Called each time the Shows tab opens, as show views and schedule fetches record newer dates. */
	refreshLastAired() {
		invoke<Record<string, string>>('get_last_aired')
			.then((loaded) => {
				this.lastAired = loaded;
			})
			.catch(errors.report);
	}

	init() {
		// The stored directory doesn't replace one the background refresh already sent
		invoke<DirectoryShow[] | null>('get_show_directory')
			.then((loaded) => {
				this.shows ??= loaded;
			})
			.catch(errors.report);

		// The background refresh sends the whole directory once it has every page
		listen<DirectoryShow[]>('show-directory', (event) => {
			this.shows = event.payload;
		}).catch(errors.report);
	}
}

export const directory = new Directory();
