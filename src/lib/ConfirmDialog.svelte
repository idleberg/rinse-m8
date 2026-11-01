<script lang="ts">
	const id = $props.id();

	let dialog: HTMLDialogElement;
	let cancel: HTMLButtonElement;

	let title = $state('');
	let message = $state('');
	let action = $state('');
	let resolve: ((confirmed: boolean) => void) | undefined;

	/** The button last clicked outside the dialog. WebKit doesn't focus buttons on click, so the native focus return misses it. */
	let opener: HTMLElement | null = null;

	/** Resolves `true` only when the action button closes the dialog, and `false` on Cancel, `[×]` or Esc. */
	export function confirm(options: { title: string; message: string; action: string }): Promise<boolean> {
		// Declines a second request rather than replacing the question already showing
		if (dialog.open) {
			return Promise.resolve(false);
		}

		({ title, message, action } = options);

		// Esc closes without setting it, so the last choice would linger
		dialog.returnValue = '';
		dialog.showModal();

		// Not the first button, `[×]`, so pressing Enter by accident does nothing
		cancel.focus();

		return new Promise((r) => {
			resolve = r;
		});
	}
</script>

<!-- Captured, so it's recorded before the click's own handler opens the dialog -->
<svelte:window
	onclickcapture={(event) => {
		if (!dialog.open && event.target instanceof Element) {
			opener = event.target.closest('button');
		}
	}}
/>

<!-- A modal: focus stays inside, Esc closes it, and the page behind is inert -->
<dialog
	bind:this={dialog}
	aria-labelledby="{id}-title"
	onclose={() => {
		opener?.focus();
		resolve?.(dialog.returnValue === 'confirm');
	}}
>
	<form method="dialog">
		<header>
			<h2 id="{id}-title">{title}</h2>
			<button type="submit" class="close" value="cancel" aria-label="Close">[×]</button>
		</header>
		<p>{message}</p>
		<footer>
			<button type="submit" value="cancel" bind:this={cancel}>Cancel</button>
			<button type="submit" value="confirm">{action}</button>
		</footer>
	</form>
</dialog>

<style>
	dialog {
		border: 1px solid currentColor;
		padding: 0;
		background: var(--paper);
		color: var(--ink);
	}

	/* A row of `-` characters between the parts, as in the episode tables */
	header,
	p {
		background: linear-gradient(to right, var(--muted) 60%, transparent 0) left bottom / 1ch 1px repeat-x;
	}

	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 2ch;
		padding: 0.25rem 1ch;
	}

	h2 {
		margin: 0;
		font-size: inherit;
		text-transform: uppercase;
	}

	.close {
		border: none;
		padding: 0;
	}

	p {
		margin: 0;
		padding: 1rem 1ch;
	}

	footer {
		display: flex;
		justify-content: flex-end;
		gap: 1ch;
		padding: 0.5rem 1ch;
	}
</style>
