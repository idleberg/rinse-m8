<script lang="ts">
	import { getVersion } from '@tauri-apps/api/app';
	import { invoke } from '@tauri-apps/api/core';
	import { openUrl } from '@tauri-apps/plugin-opener';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import { confirm } from '#lib/confirm.svelte';
	import type { ShowOrder } from '#lib/episodes';
	import { errors } from '#lib/errors.svelte';
	import { lastfm } from '#lib/lastfm.svelte';
	import { type ImageStyle, type PlayBehaviour, settings } from '#lib/settings.svelte';
	import { updates } from '#lib/updates.svelte';

	/** In hours. */
	// biome-ignore lint/style/noMagicNumbers: the list is the menu's choices
	const updateIntervals = [1, 6, 12, 24, 48];
	/** In hours, where 0 checks only at launch. */
	// biome-ignore lint/style/noMagicNumbers: the list is the menu's choices
	const appUpdateIntervals = [1, 6, 24];
	/** In weeks, where 0 is never. */
	// biome-ignore lint/style/noMagicNumbers: the list is the menu's choices
	const seenAfterWeeks = [0, 1, 2, 4, 8, 12];
	const imageStyles: [ImageStyle, string][] = [
		['original', 'Original'],
		['grayscale', 'Black & white'],
		['dithered', 'Dithered'],
	];
	const showOrders: [ShowOrder, string][] = [
		['alphabetical', 'Alphabetical'],
		['subscribed', 'Subscription date'],
		['lastUpdated', 'Last updated'],
	];
	const playBehaviours: [PlayBehaviour, string][] = [
		['ask', 'Always ask'],
		['play', 'Always play'],
		['queue', 'Always queue'],
	];
	const bytesPerMegabyte = 1e6;
	const megabytes = new Intl.NumberFormat(undefined, { style: 'unit', unit: 'megabyte', maximumFractionDigits: 1, maximumSignificantDigits: 1, roundingPriority: 'morePrecision' });

	/** In bytes, or null until it has loaded. Measured afresh each time the view opens, since show views fill the
	 * cache. */
	let imageCacheSize = $state<number | null>(null);

	invoke<number>('get_image_cache_size')
		.then((size) => {
			imageCacheSize = size;
		})
		.catch(errors.report);

	/** Keeps the old size showing if clearing fails. */
	async function clearImageCache() {
		errors.clear();

		if (!(await confirm({ title: 'Clear Image Cache', message: 'Clear the cached show images?', primaryAction: 'Clear', secondaryAction: 'Cancel' }))) {
			return;
		}

		try {
			await invoke('clear_image_cache');
			imageCacheSize = 0;
		} catch (e) {
			errors.report(e);
		}
	}

	let version = $state('');

	getVersion().then((v) => {
		version = v;
	});
</script>

<!-- One grid for all groups, so the labels share a column; the sections and lists are display: contents -->
<div class="groups">
	<section>
		<h2>General</h2>
		<dl>
			<dt>Appearance</dt>
			<dd>
				<ThemeToggle />
			</dd>
			<dt>Image style</dt>
			<dd>
				<select aria-label="Image style" value={settings.stored.imageStyle} onchange={(e) => settings.save('imageStyle', e.currentTarget.value as ImageStyle)}>
					{#each imageStyles as [style, label]}
						<option value={style}>{label}</option>
					{/each}
				</select>
			</dd>
			<dt>”My Shows” order</dt>
			<dd>
				<select aria-label="Show order" value={settings.stored.showOrder} onchange={(e) => settings.save('showOrder', e.currentTarget.value as ShowOrder)}>
					{#each showOrders as [order, label]}
						<option value={order}>{label}</option>
					{/each}
				</select>
			</dd>
			<dt>Window</dt>
			<dd>
				<label>
					<input type="checkbox" checked={settings.stored.keepRunning} onchange={(e) => settings.save('keepRunning', e.currentTarget.checked)} />
					keep running in menu bar
				</label>
			</dd>
			<dt>App updates</dt>
			<dd>
				<select aria-label="App update check" value={settings.stored.appUpdateInterval} onchange={(e) => settings.save('appUpdateInterval', Number(e.currentTarget.value))}>
					{#each appUpdateIntervals as hours}
						<option value={hours}>check every {hours === 1 ? 'hour' : `${hours} hours`}</option>
					{/each}
				</select>
				<button type="button" onclick={updates.checkNow} disabled={updates.cooling}>Check now</button>
			</dd>
		</dl>
	</section>
	<section>
		<h2>Library</h2>
		<dl>
			<dt>Show updates</dt>
			<dd>
				<select aria-label="Update interval" value={settings.stored.updateInterval} onchange={(e) => settings.save('updateInterval', Number(e.currentTarget.value))}>
					{#each updateIntervals as hours}
						<option value={hours}>every {hours === 1 ? 'hour' : `${hours} hours`}</option>
					{/each}
				</select>
			</dd>
			<dt>Seen after</dt>
			<dd>
				<select aria-label="Seen after" value={settings.stored.seenAfter} onchange={(e) => settings.save('seenAfter', Number(e.currentTarget.value))}>
					{#each seenAfterWeeks as weeks}
						<option value={weeks}>{weeks === 0 ? 'never' : weeks === 1 ? '1 week' : `${weeks} weeks`}</option>
					{/each}
				</select>
			</dd>
			<dt>Subscriptions</dt>
			<dd>
				<button type="button" onclick={settings.importSubscriptions} disabled={settings.importing}>Import…</button>
				<button type="button" onclick={settings.exportSubscriptions} disabled={settings.importing || settings.subscribed.length === 0}>Export…</button>
				{#if settings.importing}
					<span class="muted">importing…</span>
				{/if}
			</dd>
			<dt>Image cache</dt>
			<dd>
				{#if imageCacheSize}
					{megabytes.format(imageCacheSize / bytesPerMegabyte)}
				{:else if imageCacheSize === 0}
					<span class="muted">Empty</span>
				{/if}
				<button type="button" onclick={clearImageCache} disabled={!imageCacheSize}>Clear</button>
			</dd>
		</dl>
	</section>
	<section>
		<h2>Downloads</h2>
		<dl>
			<dt>Folder</dt>
			<dd>
				{#if settings.stored.downloadFolder}
					<code>{settings.stored.downloadFolder}</code>
				{:else}
					<span class="muted">None set</span>
				{/if}
				<button type="button" onclick={settings.chooseFolder}>Change…</button>
			</dd>
			<dt>Automatic Downloads</dt>
			<dd>
				<label>
					<input type="checkbox" checked={settings.stored.autoDownload} onchange={(e) => settings.save('autoDownload', e.currentTarget.checked)} />
					download new episodes of subscribed shows
				</label>
			</dd>
			<dt>Group by show</dt>
			<dd>
				<label>
					<input type="checkbox" checked={settings.stored.groupByShow} onchange={(e) => settings.save('groupByShow', e.currentTarget.checked)} />
					save each download in a folder named after its show
				</label>
			</dd>
		</dl>
	</section>
	<section>
		<h2>Playback</h2>
		<dl>
			<dt>Play behaviour</dt>
			<dd>
				<select aria-label="Play behaviour" value={settings.stored.playBehaviour} onchange={(e) => settings.save('playBehaviour', e.currentTarget.value as PlayBehaviour)}>
					{#each playBehaviours as [behaviour, label]}
						<option value={behaviour}>{label}</option>
					{/each}
				</select>
			</dd>
			<dt>When finished</dt>
			<dd>
				<label>
					<input type="checkbox" checked={settings.stored.clearPlayer} onchange={(e) => settings.save('clearPlayer', e.currentTarget.checked)} />
					empty the player
				</label>
			</dd>
			{#if lastfm.account}
				<dt>Last.fm</dt>
				<dd>
					{#if lastfm.connecting}
						<span class="muted">waiting for approval…</span>
						<button type="button" onclick={lastfm.cancel}>Cancel</button>
					{:else if lastfm.account.user}
						connected as {lastfm.account.user}
						<button type="button" onclick={lastfm.disconnect}>Disconnect</button>
					{:else}
						<button type="button" onclick={lastfm.connect}>Connect</button>
					{/if}
				</dd>
			{/if}
		</dl>
	</section>
</div>

{#if version}
	<footer>
		VERSION {version}
		<!-- Opens in the browser, since the webview would navigate away from the app -->
		<a
			href="https://github.com/idleberg/rinse-m8"
			onclick={(e) => {
				e.preventDefault();
				openUrl(e.currentTarget.href);
			}}
		>
			<!-- Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0) -->
			<svg viewBox="0 0 480 512">
				<title>GitHub</title>
				<!-- The face, which the head leaves out -->
				<path
					class="face"
					d="M415.7 328.7c0-43.9-26.7-82.6-73.5-82.6-18.9 0-37 3.4-56 6-14.9 2.3-29.8 3.2-45.1 3.2-15.2 0-30.1-.9-45.1-3.2-18.7-2.6-37-6-56-6-46.8 0-73.5 38.7-73.5 82.6 0 87.8 80.4 101.3 150.4 101.3h48.2c70.3 0 150.6-13.4 150.6-101.3z"
				/>
				<path
					d="M186.1 328.7c0 20.9-10.9 55.1-36.7 55.1s-36.7-34.2-36.7-55.1 10.9-55.1 36.7-55.1 36.7 34.2 36.7 55.1zM480 278.2c0 31.9-3.2 65.7-17.5 95-37.9 76.6-142.1 74.8-216.7 74.8-75.8 0-186.2 2.7-225.6-74.8-14.6-29-20.2-63.1-20.2-95 0-41.9 13.9-81.5 41.5-113.6-5.2-15.8-7.7-32.4-7.7-48.8 0-21.5 4.9-32.3 14.6-51.8 45.3 0 74.3 9 108.8 36 29-6.9 58.8-10 88.7-10 27 0 54.2 2.9 80.4 9.2 34-26.7 63-35.2 107.8-35.2 9.8 19.5 14.6 30.3 14.6 51.8 0 16.4-2.6 32.7-7.7 48.2 27.5 32.4 39 72.3 39 114.2zm-64.3 50.5c0-43.9-26.7-82.6-73.5-82.6-18.9 0-37 3.4-56 6-14.9 2.3-29.8 3.2-45.1 3.2-15.2 0-30.1-.9-45.1-3.2-18.7-2.6-37-6-56-6-46.8 0-73.5 38.7-73.5 82.6 0 87.8 80.4 101.3 150.4 101.3h48.2c70.3 0 150.6-13.4 150.6-101.3zm-82.6-55.1c-25.8 0-36.7 34.2-36.7 55.1s10.9 55.1 36.7 55.1 36.7-34.2 36.7-55.1-10.9-55.1-36.7-55.1z"
				/>
			</svg>
		</a>
	</footer>
{/if}

<style>
	.groups {
		display: grid;
		grid-template-columns: max-content 1fr;
		gap: 1rem 2ch;
		align-items: baseline;
	}

	section,
	dl {
		display: contents;
	}

	/* Matches the show headings in the other views */
	h2 {
		grid-column: 1 / -1;
		margin: 0;
		font-size: 1.25rem;
		text-transform: uppercase;
	}

	section:not(:first-child) h2 {
		margin-top: 1rem;
	}

	dt {
		text-transform: uppercase;
	}

	dd {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 1ch;
		margin: 0;
	}

	code {
		overflow-wrap: anywhere;
	}

	/* Mirrors the nav at the bottom of the view, which is a flex column. The negative margins span the padding of <main>. */
	footer {
		box-sizing: border-box;
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 40px;
		margin: auto -1rem -1rem;
		padding: 0 1rem;
		border-top: 1px solid currentColor;
	}

	/* Sized like an icon button (plus its border), so it lines up with the heart in the nav below */
	a {
		display: grid;
		place-items: center;
		width: calc(1.5em + 2px);
		color: var(--accent);
	}

	svg {
		width: 1.25em;
		height: 1.25em;
		fill: currentColor;
	}

	/* The light paper color, in both themes */
	.face {
		fill: rgb(242 239 232);
	}

	.muted {
		color: var(--muted);
	}
</style>
