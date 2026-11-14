import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { confirm } from './confirm.svelte';
import type { DownloadQueue, Episode } from './episodes';
import { episodes } from './episodes.svelte';
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
	/** Set while the download bar shows the dev panel's fake download. */
	faked = $state(false);
	#hooks: Hooks = { openQueue: () => {} };
	/** The real queue the fake hides, shown again once the fake is. */
	#realQueue: DownloadQueue | null = null;
	#fakeTimer: ReturnType<typeof setInterval> | undefined;

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

	/** Drops the episode from the previous downloads. */
	unmark = (id: string) => run('unmark_downloaded', { id });

	/** Empties the previous downloads, once confirmed. */
	clear = async () => {
		if (
			await confirm({
				title: 'Clear Downloads',
				message: 'Clear the list of previous downloads?',
				primaryAction: 'Clear',
				secondaryAction: 'Cancel',
			})
		) {
			await run('clear_downloaded');
		}
	};

	/** Shows or hides the dev panel's fake download: the first cached episode running, the next three waiting. Its
	 * progress loops from 0 to 100% until hidden. */
	fake = (on: boolean) => {
		const [current, ...waiting] = episodes.list.slice(0, 4);

		clearInterval(this.#fakeTimer);

		// A real queue that replaced the fake stays
		if (!on) {
			if (this.faked) {
				this.faked = false;
				this.queue = this.#realQueue ?? this.queue;
			}

			return;
		}

		if (!current) {
			return;
		}

		this.#realQueue ??= this.queue;
		this.faked = true;
		this.queue = { ...this.queue, current, percent: 0, waiting };

		this.#fakeTimer = setInterval(() => {
			if (!this.faked) {
				clearInterval(this.#fakeTimer);

				return;
			}

			this.queue.percent = ((this.queue.percent ?? 0) + 5) % 105;
		}, 100);
	};

	init(hooks: Hooks) {
		this.#hooks = hooks;

		invoke<DownloadQueue>('get_download_queue').then(this.#replace).catch(errors.report);

		listen<DownloadQueue>('download-queue', (event) => this.#replace(event.payload)).catch(
			errors.report,
		);
	}

	/** A real queue ends the fake. */
	#replace = (queue: DownloadQueue) => {
		this.faked = false;
		this.#realQueue = null;
		this.queue = queue;
	};
}

export const downloads = new Downloads();
