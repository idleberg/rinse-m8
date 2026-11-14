<script lang="ts">
	import { openUrl } from '@tauri-apps/plugin-opener';
	import type { Snippet } from 'svelte';
	import { type Episode, shareLink, webPage } from '#lib/episodes';
	import { errors } from '#lib/errors.svelte';
	import { placeFlyout } from '#lib/flyout';

	/** The row's entries, as buttons with `role="menuitem"` or `role="menuitemcheckbox"`; the default entries for
	 * `episode` follow them. Choosing one closes the flyout. `share` shows a share icon on the trigger instead. */
	let { episode, share = false, children }: { episode: Episode; share?: boolean; children?: Snippet } = $props();

	const label = $derived(share ? 'Share' : 'More actions');

	const id = $props.id();

	let trigger: HTMLButtonElement;
	let menu: HTMLDivElement;
	let open = $state(false);

	const entries = () => [...menu.querySelectorAll<HTMLButtonElement>('[role^="menuitem"]:not(:disabled)')];
</script>

<!-- A fixed flyout would drift from its trigger as the page scrolls -->
<svelte:window
	onscroll={() => {
		if (open) {
			menu.hidePopover();
		}
	}}
/>

<button
	bind:this={trigger}
	type="button"
	class="icon"
	aria-label={label}
	title={label}
	aria-haspopup="menu"
	aria-controls={id}
	aria-expanded={open}
	popovertarget={id}
>
	<svg viewBox="0 0 16 16" aria-hidden="true">
		{#if share}
			<!-- An arrow out of a tray -->
			<path d="M8 10V1.5M4.5 5L8 1.5 11.5 5M2.5 8.5v5h11v-5" />
		{:else}
			<path d="M3 8h.01M8 8h.01M13 8h.01" stroke-linecap="round" stroke-width="2.5" />
		{/if}
	</svg>
</button>

<!-- A native popover: it sits in the top layer, so the table can't clip it, and Esc or a click outside closes it -->
<!-- Placed from the trigger in script, since WebKitGTK doesn't support CSS anchor positioning reliably -->
<div
	bind:this={menu}
	{id}
	popover="auto"
	role="menu"
	tabindex="-1"
	onbeforetoggle={(event) => {
		if (event.newState === 'open') {
			const { clientWidth, clientHeight } = document.documentElement;

			Object.assign(menu.style, { top: '', bottom: '' }, placeFlyout(trigger.getBoundingClientRect(), { width: clientWidth, height: clientHeight }));
		}
	}}
	ontoggle={(event) => {
		open = event.newState === 'open';

		if (open) {
			entries()[0]?.focus();

			return;
		}

		// Only when focus was in the flyout, so a click outside keeps what it focused
		if (menu.contains(document.activeElement) || document.activeElement === document.body) {
			trigger.focus();
		}
	}}
	onclick={(event) => {
		if (event.target instanceof Element && event.target.closest('[role^="menuitem"]')) {
			// Before hiding, so a confirmation the entry opens returns focus here too
			trigger.focus();
			menu.hidePopover();
		}
	}}
	onkeydown={(event) => {
		const items = entries();
		const current = items.indexOf(document.activeElement as HTMLButtonElement);
		const next = {
			ArrowDown: current + 1,
			ArrowUp: current - 1,
			Home: 0,
			End: -1,
		}[event.key];

		if (event.key === 'Tab') {
			event.preventDefault();
			menu.hidePopover();
		} else if (next !== undefined && items.length) {
			event.preventDefault();
			items.at(next % items.length)?.focus();
		}
	}}
>
	{#if children}
		{@render children()}
		<hr />
	{/if}
	<!-- Opens in the browser, since the webview would navigate away from the app -->
	<button type="button" role="menuitem" onclick={() => openUrl(webPage(episode)).catch(errors.report)}>View on web</button>
	<!-- Enabled after a 404, since the link is still the link -->
	<button
		type="button"
		role="menuitem"
		disabled={!episode.mp3}
		onclick={() => episode.mp3 && navigator.clipboard.writeText(episode.mp3).catch(errors.report)}
	>
		Copy download link
	</button>
	<!-- Copies a rinse-m8:// link that plays or queues the episode in another M8's app -->
	<button type="button" role="menuitem" onclick={() => navigator.clipboard.writeText(shareLink(episode)).catch(errors.report)}>
		Share with a M8
	</button>
</div>

<style>
	/* The UA centres a popover in the window; the insets come from placeFlyout instead */
	[popover] {
		inset: auto;
		margin: 0;
		border: 1px solid currentColor;
		padding: 0;
		background: var(--paper);
		color: var(--ink);
		text-transform: uppercase;
	}

	[popover]:popover-open {
		display: flex;
		flex-direction: column;
	}

	hr {
		margin: 0;
		border: none;
		border-top: 1px solid currentColor;
	}

	/* Each entry is a full-width line of text, inverted while hovered like any button */
	[popover] :global(button) {
		border: none;
		padding: 0 1ch;
		text-align: left;
		white-space: nowrap;
	}
</style>
