import { relaunch } from '@tauri-apps/plugin-process';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { errors } from './errors.svelte';
import { settings } from './settings.svelte';

const millisecondsPerHour = 3_600_000;
const manualCheckCooldown = 60_000;

/** App updates: checked at launch and on the interval from the settings, then downloaded and installed. */
class Updates {
	/** The update banner's version, and its download progress once started. Dismissing it hides that version until
	 * the next launch. */
	available = $state<{ version: string; percent: number | null } | null>(null);
	/** Set while the Settings' Check now button waits out its cooldown. */
	cooling = $state(false);
	/** Set while the update banner shows the dev panel's fake update. */
	faked = $state(false);
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
				this.faked = false;
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
		this.faked = false;
		this.available = null;
	};

	/** A failed download or install brings the buttons back, so the user can retry or dismiss. */
	install = async () => {
		if (!this.available) {
			return;
		}

		const { version } = this.available;

		if (this.faked) {
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

	/** Shows or hides the dev panel's fake update. */
	fake = (on: boolean) => {
		// A real update that replaced the fake stays
		if (!(on || this.faked)) {
			return;
		}

		this.faked = on;
		this.available = on ? { version: '9.0.9', percent: null } : null;
	};

	/** The fake download stops at 100% rather than relaunching, or once the fake is hidden. */
	#fakeDownload(version: string) {
		let percent = 0;

		this.available = { version, percent };

		const timer = setInterval(() => {
			// Hidden, or hidden and shown again, which starts over
			if (!this.faked || this.available?.percent !== percent) {
				clearInterval(timer);

				return;
			}

			percent += 5;
			this.available = { version, percent };

			if (percent === 100) {
				clearInterval(timer);
			}
		}, 100);
	}

	init() {
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
