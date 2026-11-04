const offlineMessage = 'You are offline';

/** The error banner's message. */
class Errors {
	message = $state('');

	// Arrow functions, so they can be passed as callbacks such as `.catch(errors.report)`
	report = (e: unknown) => {
		this.message = String(e);
	};

	clear = () => {
		this.message = '';
	};

	/** Going back online clears only the offline banner, not an error shown since. */
	init() {
		window.addEventListener('offline', () => this.report(offlineMessage));

		window.addEventListener('online', () => {
			if (this.message === offlineMessage) {
				this.clear();
			}
		});
	}
}

export const errors = new Errors();
