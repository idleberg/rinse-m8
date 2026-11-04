import { relaunch } from '@tauri-apps/plugin-process';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { errors } from './errors.svelte';
import { settings } from './settings.svelte';

// `mise run dev:update` fakes an update for design review; release builds drop this, since DEV is false there
const fakeUpdate = import.meta.env.DEV && Boolean(import.meta.env.VITE_FAKE_UPDATE);

const millisecondsPerHour = 3_600_000;
const manualCheckCooldown = 60_000;

/** App updates: checked at launch and on the interval from the settings, then downloaded and installed. */
class Updates {
	/** The update banner's version, and its download progress once started. Dismissing it hides that version until
	 * the next launch. */
	available = $state<{ version: string; percent: number | null } | null>(null);
	/** Set while the Settings' Check now button waits out its cooldown. */
	cooling = $state(false);
	#found: Update | null = null;
	#dismissed: string | null = null;

	// Arrow functions, so they can be passed as callbacks such as `onclick={updates.install}`

	check = async () => {
		// A running download keeps the update it started with
		if (this.available && this.available.percent !== null) {
			return;
		}

		try {
			const found = await check();

			this.#found = found;

			if (found && found.version !== this.#dismissed) {
				this.available = { version: found.version, percent: null };
			}
		} catch {
			// Being offline is normal, so a failed check stays silent
		}
	};

	checkNow = () => {
		this.cooling = true;
		this.check();

		setTimeout(() => {
			this.cooling = false;
		}, manualCheckCooldown);
	};

	dismiss = () => {
		this.#dismissed = this.available?.version ?? null;
		this.available = null;
	};

	/** A failed download or install brings the buttons back, so the user can retry or dismiss. */
	install = async () => {
		if (!this.available) {
			return;
		}

		const { version } = this.available;

		if (fakeUpdate) {
			this.#fakeDownload(version);

			return;
		}

		if (!this.#found) {
			return;
		}

		let total = 0;
		let received = 0;

		errors.clear();
		this.available = { version, percent: 0 };

		try {
			await this.#found.downloadAndInstall((event) => {
				if (event.event === 'Started') {
					total = event.data.contentLength ?? 0;
				} else if (event.event === 'Progress' && total) {
					received += event.data.chunkLength;
					this.available = { version, percent: Math.floor((received / total) * 100) };
				}
			});

			await relaunch();
		} catch (e) {
			errors.report(e);
			this.available = { version, percent: null };
		}
	};

	/** The fake download stops at 100% rather than relaunching. */
	#fakeDownload(version: string) {
		const progress = { version, percent: 0 };

		this.available = progress;

		const timer = setInterval(() => {
			progress.percent += 5;
			this.available = { ...progress };

			if (progress.percent === 100) {
				clearInterval(timer);
			}
		}, 100);
	}

	init() {
		if (fakeUpdate) {
			this.available = { version: '9.9.9', percent: null };

			return;
		}

		this.check();

		// The launch check above runs regardless, so 0 only skips the repeats
		$effect(() => {
			if (!settings.stored.appUpdateInterval) {
				return;
			}

			const timer = setInterval(
				this.check,
				settings.stored.appUpdateInterval * millisecondsPerHour,
			);

			return () => clearInterval(timer);
		});
	}
}

export const updates = new Updates();
