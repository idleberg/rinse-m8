<script module lang="ts">
	import { byVersion } from '#lib/whats-new';

	/** Each version's notes, as HTML, keyed by the version named in the file name */
	const notes: Record<string, string> = Object.fromEntries(
		Object.entries(import.meta.glob<string>('../release-notes/*.md', { eager: true, import: 'default' })).map(([path, html]) => [path.slice(path.lastIndexOf('/') + 1, -'.md'.length), html]),
	);

	/** The newest bundled notes' version, if any are bundled. */
	export const newest = Object.keys(notes).sort(byVersion).at(-1);

	interface Page {
		version: string;
		html: string;
	}

	let show: (pages: Page[]) => void;

	/** The pages for the given versions, in the order given. */
	const toPages = (versions: string[]) => versions.map((version) => ({ version, html: notes[version] }));

	/** Opens the dialog with the given pages, if there are any, leaving the seen version alone. The DevPanel's default is
	 * every bundled note, newest first. */
	export function preview(shown = toPages(Object.keys(notes).sort((a, b) => byVersion(b, a)))) {
		if (shown.length > 0) {
			show(shown);
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
	let newer: HTMLButtonElement | undefined = $state();
	let older: HTMLButtonElement | undefined = $state();
	let pages: Page[] = $state([]);
	let index = $state(0);
	let page = $derived(pages[index]);

	/** Turns by one page, handing focus to the other arrow when this one ends up disabled at either end. */
	function turn(by: -1 | 1, other?: HTMLButtonElement) {
		index += by;

		if (index === 0 || index === pages.length - 1) {
			other?.focus();
		}
	}

	show = (shown) => {
		pages = shown;
		index = 0;
		dialog.showModal();
		ok.focus();
	};

	// Read now, before the filters' effect first saves them on a fresh install
	const seen = seenVersion(localStorage);

	// Recorded on every launch, so a fresh install stays quiet and each version's notes show at most once
	getVersion()
		.then((current) => {
			localStorage.setItem('seenVersion', current);

			preview(toPages(pickNotes(seen, current, Object.keys(notes))));
		})
		.catch(errors.report);
</script>

<!-- A modal like the confirm dialog, in the update bar's colours -->
<dialog bind:this={dialog} aria-labelledby="{id}-title">
	<form method="dialog">
		<header>
			<h2 id="{id}-title">What's new in {page?.version}</h2>
			<button type="submit" class="plain" aria-label="Close">[×]</button>
		</header>
		<div class="notes">{@html page?.html}</div>
		<footer>
			<!-- Newest first, so Newer goes back and Older goes on -->
			{#if pages.length > 1}
				<div class="buttons">
					<button type="button" class="icon" aria-label="Newer" title="Newer" disabled={index === 0} bind:this={newer} onclick={() => turn(-1, older)}>
						<svg viewBox="0 0 16 16" data-icon="newer" aria-hidden="true">
							<path d="M10 3l-5 5 5 5" />
						</svg>
					</button>
					<span>{index + 1}/{pages.length}</span>
					<button type="button" class="icon" aria-label="Older" title="Older" disabled={index === pages.length - 1} bind:this={older} onclick={() => turn(1, newer)}>
						<svg viewBox="0 0 16 16" data-icon="older" aria-hidden="true">
							<path d="M6 3l5 5-5 5" />
						</svg>
					</button>
				</div>
			{/if}
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
		/* White inside black in both modes, as a shadow so it stays clear of any focus outline */
		border: 1px solid white;
		box-shadow: 0 0 0 1px black;
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
		align-items: center;
		padding: 0.5rem 1ch;
	}

	/* Paging on the left, when there is any, and OK on the right */
	footer .buttons {
		align-items: center;
		margin-right: auto;
	}

	/* Hidden at either end rather than greyed out, still taking its space so the counter stays put */
	footer .buttons button:disabled {
		visibility: hidden;
	}
</style>
