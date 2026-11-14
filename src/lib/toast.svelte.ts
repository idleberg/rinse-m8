/** How long a toast shows by default, in milliseconds. */
const shownFor = 1500;

/** A short message over the bars at the bottom, such as a copy's confirmation. One at a time; a new one replaces it. */
class Toast {
	message = $state('');
	#timer: ReturnType<typeof setTimeout> | undefined;

	// Arrow functions, so they can be passed as callbacks

	/** Shows the message for `timeout` milliseconds, or until hidden when `timeout` is null. */
	show = (message: string, timeout: number | null = shownFor) => {
		this.message = message;
		clearTimeout(this.#timer);

		if (timeout !== null) {
			this.#timer = setTimeout(this.hide, timeout);
		}
	};

	hide = () => {
		clearTimeout(this.#timer);
		this.message = '';
	};
}

export const toast = new Toast();
