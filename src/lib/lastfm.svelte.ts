import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { confirm } from './confirm.svelte';
import { errors } from './errors.svelte';

/** The Last.fm connection that scrobbles what's played. */
class Lastfm {
	/** Null in a build without a Last.fm API key, which leaves the Settings row out. */
	account = $state<{ user: string | null } | null>(null);
	/** While the app waits for the user to approve it on Last.fm. */
	connecting = $state(false);

	// Arrow functions, so they can be passed as callbacks such as `onclick={lastfm.connect}`

	/** Resolves once the user approves on Last.fm or cancels, and reports approval timing out. */
	connect = async () => {
		errors.clear();
		this.connecting = true;

		try {
			const user = await invoke<string | null>('connect_lastfm');

			if (user) {
				this.account = { user };
			}
		} catch (e) {
			errors.report(e);
		} finally {
			this.connecting = false;
		}
	};

	cancel = () => invoke('cancel_lastfm_connect').catch(errors.report);

	disconnect = async () => {
		errors.clear();

		if (
			!(await confirm({
				title: 'Disconnect Last.fm',
				message: `Disconnect ${this.account?.user} from Last.fm?`,
				action: 'Disconnect',
			}))
		) {
			return;
		}

		try {
			await invoke('disconnect_lastfm');
			this.account = { user: null };
		} catch (e) {
			errors.report(e);
		}
	};

	init() {
		invoke<{ user: string | null } | null>('get_lastfm')
			.then((loaded) => {
				this.account = loaded;
			})
			.catch(errors.report);

		// Sent when Last.fm rejects the session, for example after the user revoked access
		listen('lastfm-disconnected', () => {
			this.account = { user: null };
		}).catch(errors.report);
	}
}

export const lastfm = new Lastfm();
