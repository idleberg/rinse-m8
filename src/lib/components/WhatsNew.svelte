<script module lang="ts">
	import { byVersion } from '#lib/whats-new';

	/** Each version's notes, as HTML, keyed by the version named in the file name */
	const notes: Record<string, string> = Object.fromEntries(
		Object.entries(import.meta.glob<string>('../release-notes/*.md', { eager: true, import: 'default' })).map(([path, html]) => [path.slice(path.lastIndexOf('/') + 1, -'.md'.length), html]),
	);

	/** The newest bundled notes' version, if any are bundled. */
	export const newest = Object.keys(notes).sort(byVersion).at(-1);

	let show: (version: string, html: string) => void;

	/** Opens the dialog with the given notes, or else the newest bundled ones, leaving the seen version alone. For the
	 * DevPanel. */
	export function preview(version = newest, html = version && notes[version]) {
		if (version && html) {
			show(version, html);
		}
	}
</script>

<script lang="ts">
	import { getVersion } from '@tauri-apps/api/app';
	import { errors } from '#lib/errors.svelte';
	import { pickNotes, seenVersion } from '#lib/whats-new';

	const id = $props.id();

	let dialog: HTMLDialogElement;
	let ok: HTMLButtonElement;
	let version = $state('');
	let html = $state('');

	show = (shown, shownHtml) => {
		version = shown;
		html = shownHtml;
		dialog.showModal();
		ok.focus();
	};

	// Read now, before the filters' effect first saves them on a fresh install
	const seen = seenVersion(localStorage);

	// Recorded on every launch, so a fresh install stays quiet and each version's notes show at most once
	getVersion()
		.then((current) => {
			localStorage.setItem('seenVersion', current);

			const picked = pickNotes(seen, current, Object.keys(notes));

			if (!picked) {
				return;
			}

			show(picked, notes[picked]);
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
		<div class="notes">{@html html}</div>
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
		padding: 0;
		/* Redefined, so hovered buttons invert to white on blue */
		--ink: white;
		--paper: var(--info);
		background: var(--paper);
		border: 1px solid var(--paper);
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
