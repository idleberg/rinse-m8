export interface Question {
	title: string;
	message: string;
	/** The label of the button that confirms. */
	primaryAction: string;
	/** The label of the other answer, focused when the dialog opens, so it is the default. */
	secondaryAction: string;
}

/** Which button closed the dialog, or `undefined` when it was dismissed. */
export type Choice = 'primary' | 'secondary' | undefined;

/** The question `ConfirmDialog` shows, and how it's answered. */
class Confirmation {
	question = $state<Question | null>(null);
	#resolve: ((choice: Choice) => void) | undefined;

	/** Declines a second question rather than replacing the one already showing. */
	ask(question: Question): Promise<Choice> {
		if (this.question) {
			return Promise.resolve(undefined);
		}

		this.question = question;

		return new Promise((resolve) => {
			this.#resolve = resolve;
		});
	}

	answer(choice?: Choice) {
		this.#resolve?.(choice);
		this.#resolve = undefined;
		this.question = null;
	}
}

export const confirmation = new Confirmation();

/** Resolves which action button closed the dialog, or `undefined` on `[×]` or Esc. */
export function choose(question: Question) {
	return confirmation.ask(question);
}

/** Resolves `true` only when the primary action closes the dialog, and `false` otherwise. */
export async function confirm(question: Question) {
	return (await choose(question)) === 'primary';
}
