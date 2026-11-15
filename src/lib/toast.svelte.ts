/** How long a toast shows by default, in milliseconds. */
const shownFor = 1500;

/** A button beside the toast's message, such as UNDO. */
export interface ToastAction {
	label: string;
	run: () => void | Promise<void>;
}

/** A short message over the bars at the bottom, such as a copy's confirmation. One at a time; a new one replaces it,
 * action and all. */
class Toast {
	message = $state('');
	action = $state<ToastAction>();
	#timer: ReturnType<typeof setTimeout> | undefined;

	// Arrow functions, so they can be passed as callbacks

	/** Shows the message for `timeout` milliseconds, or until hidden when `timeout` is null. */
	show = (message: string, timeout: number | null = shownFor, action?: ToastAction) => {
		this.message = message;
		this.action = action;
		clearTimeout(this.#timer);

		if (timeout !== null) {
			this.#timer = setTimeout(this.hide, timeout);
		}
	};

	hide = () => {
		clearTimeout(this.#timer);
		this.message = '';
		this.action = undefined;
	};

	/** Hides the toast and runs its action, if it still has one, resolving once the action has. */
	act = async () => {
		const { action } = this;

		this.hide();
		await action?.run();
	};
}

export const toast = new Toast();
