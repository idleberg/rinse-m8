import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { choose } from './confirm.svelte';
import type { Show, ShowOrder } from './episodes';
import { errors } from './errors.svelte';
import { toast } from './toast.svelte';

export interface Stored {
	subscriptions: Show[];
	seen: string[];
	downloadFolder: string | null;
	autoDownloads: AutoDownloads;
	/** Slugs of the shows enabled for auto-download while `autoDownloads` is `selected`. */
	autoDownloadShows: string[];
	/** Whether new downloads go into a folder named after their show inside the download folder. */
	groupByShow: boolean;
	keepRunning: boolean;
	/** Whether the player empties once the last episode ends, with nothing queued or repeating. */
	clearPlayer: boolean;
	/** In hours. */
	updateInterval: number;
	/** In hours, or 0 to check only at launch. */
	appUpdateInterval: number;
	/** In weeks, or 0 for never: how old an episode must be to count as seen. */
	seenAfter: number;
	imageStyle: ImageStyle;
	showOrder: ShowOrder;
	playBehaviour: PlayBehaviour;
}

/** How show and episode artwork looks in the Player tab and the show view. */
export type ImageStyle = 'original' | 'dithered' | 'grayscale';

/** Which subscribed shows get their new episodes downloaded. */
export type AutoDownloads = 'off' | 'selected' | 'all';

/** What PLAY on an episode row does while another episode plays. */
export type PlayBehaviour = 'ask' | 'play' | 'queue';

const jsonFilters = [{ name: 'JSON', extensions: ['json'] }];

/** How long the unsubscribe toast shows, in milliseconds: long enough to reach its UNDO button. */
const undoShownFor = 5000;

/** The stored settings, subscriptions included, and the changes the Settings view and subscribe buttons make. */
class Settings {
	stored = $state<Stored>({
		subscriptions: [],
		seen: [],
		downloadFolder: null,
		autoDownloads: 'off',
		autoDownloadShows: [],
		groupByShow: false,
		keepRunning: true,
		clearPlayer: false,
		updateInterval: 6,
		appUpdateInterval: 24,
		seenAfter: 0,
		imageStyle: 'original',
		showOrder: 'subscribed',
		playBehaviour: 'ask',
	});
	/** Show slugs. */
	subscribed = $derived(this.stored.subscriptions.map((s) => s.slug));
	/** Show slugs, while their subscribe or unsubscribe runs. */
	subscribing = $state<string[]>([]);
	/** While an import subscribes to the file's shows. */
	importing = $state(false);

	// Arrow functions, so they can be passed as callbacks such as `onclick={settings.chooseFolder}`

	/** Asks for a download folder and saves it, resolving false if the dialog was cancelled or saving failed. */
	chooseFolder = async () => {
		errors.clear();

		try {
			const folder = await open({
				directory: true,
				title: 'Choose a download folder',
				defaultPath: this.stored.downloadFolder ?? undefined,
			});

			if (!folder) {
				return false;
			}

			await invoke('set_settings', { patch: { downloadFolder: folder } });
			this.stored.downloadFolder = folder;

			return true;
		} catch (e) {
			errors.report(e);

			return false;
		}
	};

	/** Resolves true once a download folder is set, asking for one if needed. */
	ensureFolder = async () => Boolean(this.stored.downloadFolder) || this.chooseFolder();

	/** The `image` scheme URL `src` in the stored image style. Each style has its own URL, so the webview never mixes
	 * up copies from different styles. */
	styled = (src: string) => {
		const style = this.stored.imageStyle;

		return style === 'original' ? src : `${src}?style=${style}`;
	};

	/** Saves a checkbox, interval or menu choice, and puts the stored value back if saving fails. */
	async save<
		K extends
			| 'autoDownloads'
			| 'groupByShow'
			| 'keepRunning'
			| 'clearPlayer'
			| 'updateInterval'
			| 'appUpdateInterval'
			| 'seenAfter'
			| 'imageStyle'
			| 'showOrder'
			| 'playBehaviour',
	>(key: K, value: Stored[K]) {
		const previous = this.stored[key];

		errors.clear();
		this.stored[key] = value;

		try {
			await invoke('set_settings', { patch: { [key]: value } });
		} catch (e) {
			this.stored[key] = previous;
			errors.report(e);
		}
	}

	/** Why the show's auto-download can't be toggled, or undefined if it can. Only subscribed shows are polled, so a
	 * flag on any other show would do nothing. */
	autoDownloadBlocked(slug: string) {
		if (!this.subscribed.includes(slug)) {
			return 'Subscribe to the show to auto-download it';
		}

		return {
			off: 'Auto-download is off in Settings',
			selected: undefined,
			all: 'All subscribed shows auto-download',
		}[this.stored.autoDownloads];
	}

	/** Enables or disables the show's auto-download. Enabling asks for a download folder first if none is set, and
	 * does nothing if that dialog is cancelled. */
	async setAutoDownload(slug: string, enabled: boolean) {
		if (enabled && !(await this.ensureFolder())) {
			return;
		}

		errors.clear();

		try {
			this.stored = await invoke<Stored>('set_auto_download', { slug, enabled });
		} catch (e) {
			errors.report(e);
		}
	}

	/** Subscribes to the show, asking about auto-download as the Auto-downloads setting says, or unsubscribes with a
	 * toast that offers to undo it. */
	async toggle(show: Show) {
		if (!this.subscribed.includes(show.slug)) {
			return this.#subscribe(show);
		}

		await this.#run(show, async () => {
			this.stored = await invoke<Stored>('unsubscribe', { slug: show.slug });

			// Skipped if the show was subscribed again meanwhile, so UNDO never unsubscribes. UNDO neither asks nor
			// touches the auto-download flag, which the unsubscribe kept.
			// ponytail: subscribing again appends the show, so it drops to the bottom of the subscribed order; the backend
			// would need to restore its index to keep it in place
			toast.show(`You unsubscribed from ${show.title}`, undoShownFor, {
				label: 'Undo',
				run: () =>
					this.subscribed.includes(show.slug)
						? undefined
						: this.#run(show, async () => {
								this.stored = await invoke<Stored>('subscribe', {
									slug: show.slug,
									title: show.title,
								});
							}),
			});
		});
	}

	async #subscribe(show: Show) {
		const mode = this.stored.autoDownloads;
		let download = false;

		if (mode === 'selected') {
			const choice = await choose({
				title: 'Subscribe',
				message: `Download new episodes of ${show.title} automatically?`,
				primaryAction: '…with download',
				primaryName: 'Subscribe with download',
				secondaryAction: 'Subscribe',
			});

			if (!choice) {
				return;
			}

			download = choice === 'primary';
		}

		await this.#run(show, async () => {
			this.stored = await invoke<Stored>('subscribe', { slug: show.slug, title: show.title });

			// All subscribed shows download without a folder check, as they do with the flag unset
			if (mode === 'all') {
				this.stored = await invoke<Stored>('set_auto_download', { slug: show.slug, enabled: true });
			}
		});

		// After the subscribe, so a cancelled folder dialog still leaves the show subscribed
		if (download && this.subscribed.includes(show.slug)) {
			await this.setAutoDownload(show.slug, true);
		}
	}

	/** Runs a subscribe or unsubscribe of the show, disabling its buttons meanwhile and reporting a failure. */
	async #run(show: Show, change: () => Promise<void>) {
		errors.clear();
		this.subscribing.push(show.slug);

		try {
			await change();
		} catch (e) {
			errors.report(e);
		} finally {
			this.subscribing = this.subscribing.filter((s) => s !== show.slug);
		}
	}

	/** Subscribes to the shows in a file chosen by the user, keeping the existing subscriptions. */
	importSubscriptions = async () => {
		errors.clear();

		try {
			const path = await open({ title: 'Import subscriptions', filters: jsonFilters });

			if (!path) {
				return;
			}

			this.importing = true;
			this.stored = await invoke<Stored>('import_subscriptions', { path });
		} catch (e) {
			errors.report(e);
		} finally {
			this.importing = false;
		}
	};

	exportSubscriptions = async () => {
		errors.clear();

		try {
			const path = await save({
				title: 'Export subscriptions',
				defaultPath: 'rinse-m8-subscriptions.json',
				filters: jsonFilters,
			});

			if (path) {
				await invoke('export_subscriptions', { path });
			}
		} catch (e) {
			errors.report(e);
		}
	};

	init() {
		invoke<Stored>('get_settings')
			.then((loaded) => {
				this.stored = loaded;
			})
			.catch(errors.report);
	}
}

export const settings = new Settings();
