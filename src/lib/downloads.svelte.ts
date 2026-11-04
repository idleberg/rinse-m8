import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { confirm } from './confirm.svelte';
import type { DownloadQueue, Episode } from './episodes';
import { errors } from './errors.svelte';
import { settings } from './settings.svelte';

/** Navigation, which the root layout supplies so the module needn't import SvelteKit and stays testable. */
interface Hooks {
	openQueue: () => void;
}

/** Reports a failed command, so callers needn't catch. */
async function run(command: string, args?: Record<string, unknown>) {
	await invoke(command, args).catch(errors.report);
}

/** The download queue, kept in step with the backend's `download-queue` updates. */
class Downloads {
	queue = $state<DownloadQueue>({
		current: null,
		percent: null,
		waiting: [],
		failures: [],
		downloaded: [],
	});
	#hooks: Hooks = { openQueue: () => {} };

	/** Queues the episode, asking for a download folder first if none is set. A failed one is retried, and the
	 * download queue view opens to show it. */
	async download(episode: Episode) {
		errors.clear();

		try {
			if (!(await settings.ensureFolder())) {
				return;
			}

			const failed = this.queue.failures.some((e) => e.id === episode.id);

			await invoke('download', { episode });

			if (failed) {
				this.#hooks.openQueue();
			}
		} catch (e) {
			errors.report(e);
		}
	}

	// Arrow functions, so they can be passed as callbacks such as `onclick={downloads.cancel}`

	/** Stops the running download; the next waiting one starts. */
	cancel = () => run('cancel_download');

	retry = (id: string) => run('retry_download', { id });

	retryAll = () => run('retry_all_downloads');

	/** Moves a waiting download to `index` among the waiting ones. */
	move = (id: string, index: number) => run('move_download', { id, index });

	/** Drops a waiting or failed download. */
	remove = (id: string) => run('remove_download', { id });

	/** Records the episode as downloaded without downloading it. */
	mark = (id: string) => run('mark_downloaded', { id });

	/** Drops the episode from the previous downloads. */
	unmark = (id: string) => run('unmark_downloaded', { id });

	/** Empties the previous downloads, once confirmed. */
	clear = async () => {
		if (
			await confirm({
				title: 'Clear Downloads',
				message: 'Clear the list of previous downloads?',
				action: 'Clear',
			})
		) {
			await run('clear_downloaded');
		}
	};

	init(hooks: Hooks) {
		this.#hooks = hooks;

		invoke<DownloadQueue>('get_download_queue')
			.then((loaded) => {
				this.queue = loaded;
			})
			.catch(errors.report);

		listen<DownloadQueue>('download-queue', (event) => {
			this.queue = event.payload;
		}).catch(errors.report);
	}
}

export const downloads = new Downloads();
