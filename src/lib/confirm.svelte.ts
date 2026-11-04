export interface Question {
	title: string;
	message: string;
	/** The label of the button that confirms. */
	action: string;
}

/** The question `ConfirmDialog` shows, and how it's answered. */
class Confirmation {
	question = $state<Question | null>(null);
	#resolve: ((confirmed: boolean) => void) | undefined;

	/** Declines a second question rather than replacing the one already showing. */
	ask(question: Question): Promise<boolean> {
		if (this.question) {
			return Promise.resolve(false);
		}

		this.question = question;

		return new Promise((resolve) => {
			this.#resolve = resolve;
		});
	}

	answer(confirmed: boolean) {
		this.#resolve?.(confirmed);
		this.#resolve = undefined;
		this.question = null;
	}
}

export const confirmation = new Confirmation();

/** Resolves `true` only when the action button closes the dialog, and `false` on Cancel, `[×]` or Esc. */
export function confirm(question: Question) {
	return confirmation.ask(question);
}
