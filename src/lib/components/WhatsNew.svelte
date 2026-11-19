<script module lang="ts">
	import { getVersion } from '@tauri-apps/api/app';

	let show: (version: string) => void;

	/** Opens the dialog with the bundled notes, leaving the seen version alone. For the DevPanel. */
	export async function preview() {
		show(await getVersion());
	}
</script>

<script lang="ts">
	import { errors } from '#lib/errors.svelte';
	import { seenVersion, shouldShow } from '#lib/whats-new';
	import notes from '#lib/whats-new.md';

	const id = $props.id();

	let dialog: HTMLDialogElement;
	let ok: HTMLButtonElement;
	let version = $state('');

	show = (current) => {
		version = current;
		dialog.showModal();
		ok.focus();
	};

	// Read now, before the filters' effect first saves them on a fresh install
	const seen = seenVersion(localStorage);

	// Recorded on every launch, so a fresh install stays quiet and each version shows its notes at most once
	getVersion()
		.then((current) => {
			localStorage.setItem('seenVersion', current);

			if (!shouldShow(seen, current, notes)) {
				return;
			}

			show(current);
		})
		.catch(errors.report);
</script>

<!-- A modal like the confirm dialog, in the update bar's colours -->
<dialog bind:this={dialog} aria-labelledby="{id}-title">
	<form method="dialog">
		<header>
			<h2 id="{id}-title">What's new in {version}</h2>
			<button type="submit" class="plain" aria-label="Close">[×]</button>
		</header>
		<div class="notes">{@html notes}</div>
		<footer>
			<button type="submit" bind:this={ok}>OK</button>
		</footer>
	</form>
</dialog>

<style>
	/* About 10 to 15 words per line, and never wider than the window allows */
	dialog {
		width: 66ch;
		max-width: calc(100% - 2rem);
		border: 1px solid currentColor;
		padding: 0;
		/* Redefined, so hovered buttons invert to white on blue */
		--ink: white;
		--paper: var(--info);
		background: var(--paper);
		color: var(--ink);
	}

	/* A row of `-` characters between the parts, as in the episode tables */
	header,
	.notes {
		background: linear-gradient(to right, currentColor 60%, transparent 0) left bottom / 1ch 1px repeat-x;
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

	/* Long notes scroll, keeping the header and OK in view */
	.notes {
		max-height: 50vh;
		overflow: auto;
		padding: 1rem 1ch;
	}

	/* The accent red is unreadable on blue */
	.notes :global(a) {
		color: inherit;
	}

	.notes > :global(:first-child) {
		margin-top: 0;
	}

	.notes > :global(:last-child) {
		margin-bottom: 0;
	}

	footer {
		display: flex;
		justify-content: flex-end;
		padding: 0.5rem 1ch;
	}
</style>
