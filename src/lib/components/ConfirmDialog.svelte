<script lang="ts">
	import { confirmation } from '#lib/confirm.svelte';

	const id = $props.id();

	let dialog: HTMLDialogElement;
	let cancel: HTMLButtonElement;

	/** The button last clicked outside the dialog. WebKit doesn't focus buttons on click, so the native focus return misses it. */
	let opener: HTMLElement | null = null;

	$effect(() => {
		if (!confirmation.question || dialog.open) {
			return;
		}

		// Esc closes without setting it, so the last choice would linger
		dialog.returnValue = '';
		dialog.showModal();

		// Not the first button, `[×]`, so pressing Enter by accident does nothing
		cancel.focus();
	});
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
		confirmation.answer(dialog.returnValue === 'confirm');
	}}
>
	<form method="dialog">
		<header>
			<h2 id="{id}-title">{confirmation.question?.title}</h2>
			<button type="submit" class="plain" value="cancel" aria-label="Close">[×]</button>
		</header>
		<p>{confirmation.question?.message}</p>
		<footer>
			<button type="submit" value="cancel" bind:this={cancel}>Cancel</button>
			<button type="submit" value="confirm">{confirmation.question?.action}</button>
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
		/* One more pixel below, since the line sits inside the padding */
		padding: 0.25rem 1ch calc(0.25rem + 1px);
	}

	h2 {
		margin: 0;
		font-size: inherit;
		text-transform: uppercase;
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
