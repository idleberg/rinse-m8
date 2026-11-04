import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { confirm } from './confirm.svelte';
import type { Show } from './episodes';
import { errors } from './errors.svelte';

export interface Stored {
	subscriptions: Show[];
	seen: string[];
	downloadFolder: string | null;
	autoDownload: boolean;
	keepRunning: boolean;
	/** In hours. */
	updateInterval: number;
	/** In hours, or 0 to check only at launch. */
	appUpdateInterval: number;
}

const jsonFilters = [{ name: 'JSON', extensions: ['json'] }];

/** The stored settings, subscriptions included, and the changes the Settings view and subscribe buttons make. */
class Settings {
	stored = $state<Stored>({
		subscriptions: [],
		seen: [],
		downloadFolder: null,
		autoDownload: false,
		keepRunning: true,
		updateInterval: 6,
		appUpdateInterval: 24,
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

	/** Saves a checkbox or interval, and puts the stored value back if saving fails. */
	async save<K extends 'autoDownload' | 'keepRunning' | 'updateInterval' | 'appUpdateInterval'>(
		key: K,
		value: Stored[K],
	) {
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

	/** Subscribes to the show, or unsubscribes once confirmed. */
	async toggle(show: Show) {
		errors.clear();

		// Read before the dialog, so what the user confirmed is what happens
		const unsubscribing = this.subscribed.includes(show.slug);

		if (
			unsubscribing &&
			!(await confirm({
				title: 'Unsubscribe',
				message: `Unsubscribe from ${show.title}?`,
				action: 'Unsubscribe',
			}))
		) {
			return;
		}

		this.subscribing.push(show.slug);

		try {
			this.stored = unsubscribing
				? await invoke<Stored>('unsubscribe', { slug: show.slug })
				: await invoke<Stored>('subscribe', { slug: show.slug, title: show.title });
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
