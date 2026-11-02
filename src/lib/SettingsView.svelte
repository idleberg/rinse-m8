<script lang="ts">
	import { getVersion } from '@tauri-apps/api/app';
	import { openUrl } from '@tauri-apps/plugin-opener';
	import ThemeToggle from './ThemeToggle.svelte';

	let {
		downloadFolder,
		autoDownload = $bindable(),
		keepRunning = $bindable(),
		updateInterval,
		appUpdateInterval,
		imageCacheSize,
		lastfm,
		connectingLastfm,
		onchoosefolder,
		onautodownloadchange,
		onkeeprunningchange,
		onupdateintervalchange,
		onappupdateintervalchange,
		canCheckAppUpdate,
		oncheckappupdate,
		onclearimagecache,
		importing,
		canExport,
		onimport,
		onexport,
		onconnectlastfm,
		oncancellastfm,
		ondisconnectlastfm,
	}: {
		downloadFolder: string | null;
		autoDownload: boolean;
		keepRunning: boolean;
		/** In hours. */
		updateInterval: number;
		/** In hours, or 0 to check only at launch. */
		appUpdateInterval: number;
		/** In bytes, or null until it has loaded. */
		imageCacheSize: number | null;
		/** Null in a build without a Last.fm API key, which leaves the row out. */
		lastfm: { user: string | null } | null;
		/** While the app waits for the user to approve it on Last.fm. */
		connectingLastfm: boolean;
		onchoosefolder: () => void;
		/** Called after the bound checkbox has changed. */
		onautodownloadchange: () => void;
		/** Called after the bound checkbox has changed. */
		onkeeprunningchange: () => void;
		onupdateintervalchange: (hours: number) => void;
		onappupdateintervalchange: (hours: number) => void;
		/** False for a minute after a manual check. */
		canCheckAppUpdate: boolean;
		oncheckappupdate: () => void;
		onclearimagecache: () => void;
		/** While an import subscribes to the file's shows. */
		importing: boolean;
		/** Whether there are subscriptions to export. */
		canExport: boolean;
		onimport: () => void;
		onexport: () => void;
		onconnectlastfm: () => void;
		oncancellastfm: () => void;
		ondisconnectlastfm: () => void;
	} = $props();

	/** In hours. */
	// biome-ignore lint/style/noMagicNumbers: the list is the menu's choices
	const updateIntervals = [1, 6, 12, 24, 48];
	/** In hours, where 0 checks only at launch. */
	// biome-ignore lint/style/noMagicNumbers: the list is the menu's choices
	const appUpdateIntervals = [1, 6, 24];
	const bytesPerMegabyte = 1e6;
	const megabytes = new Intl.NumberFormat(undefined, { style: 'unit', unit: 'megabyte', maximumFractionDigits: 1, maximumSignificantDigits: 1, roundingPriority: 'morePrecision' });

	let version = $state('');

	getVersion().then((v) => {
		version = v;
	});
</script>

<dl>
	<dt>Appearance</dt>
	<dd>
		<ThemeToggle />
	</dd>
	<dt>Download folder</dt>
	<dd>
		{#if downloadFolder}
			<code>{downloadFolder}</code>
		{:else}
			<span class="muted">None set</span>
		{/if}
		<button type="button" onclick={onchoosefolder}>Change…</button>
	</dd>
	<dt>Downloads</dt>
	<dd>
		<label>
			<input type="checkbox" bind:checked={autoDownload} onchange={onautodownloadchange} />
			auto-download new episodes of subscribed shows
		</label>
	</dd>
	<dt>Window</dt>
	<dd>
		<label>
			<input type="checkbox" bind:checked={keepRunning} onchange={onkeeprunningchange} />
			keep running in menu bar
		</label>
	</dd>
	<dt>Show Updates</dt>
	<dd>
		<select aria-label="Update interval" value={updateInterval} onchange={(e) => onupdateintervalchange(Number(e.currentTarget.value))}>
			{#each updateIntervals as hours}
				<option value={hours}>every {hours === 1 ? 'hour' : `${hours} hours`}</option>
			{/each}
		</select>
	</dd>
	<dt>App updates</dt>
	<dd>
		<select aria-label="App update check" value={appUpdateInterval} onchange={(e) => onappupdateintervalchange(Number(e.currentTarget.value))}>
			{#each appUpdateIntervals as hours}
				<option value={hours}>check every {hours === 1 ? 'hour' : `${hours} hours`}</option>
			{/each}
		</select>
		<button type="button" onclick={oncheckappupdate} disabled={!canCheckAppUpdate}>Check now</button>
	</dd>
	<dt>Image cache</dt>
	<dd>
		{#if imageCacheSize}
			{megabytes.format(imageCacheSize / bytesPerMegabyte)}
		{:else if imageCacheSize === 0}
			<span class="muted">Empty</span>
		{/if}
		<button type="button" onclick={onclearimagecache} disabled={!imageCacheSize}>Clear</button>
	</dd>
	<dt>Subscriptions</dt>
	<dd>
		<button type="button" onclick={onimport} disabled={importing}>Import…</button>
		<button type="button" onclick={onexport} disabled={importing || !canExport}>Export…</button>
		{#if importing}
			<span class="muted">importing…</span>
		{/if}
	</dd>
	{#if lastfm}
		<dt>Last.fm</dt>
		<dd>
			{#if connectingLastfm}
				<span class="muted">waiting for approval…</span>
				<button type="button" onclick={oncancellastfm}>Cancel</button>
			{:else if lastfm.user}
				connected as {lastfm.user}
				<button type="button" onclick={ondisconnectlastfm}>Disconnect</button>
			{:else}
				<button type="button" onclick={onconnectlastfm}>Connect</button>
			{/if}
		</dd>
	{/if}
</dl>

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
	dl {
		display: grid;
		grid-template-columns: max-content 1fr;
		gap: 1rem 2ch;
		align-items: baseline;
		margin: 0;
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

	a {
		display: flex;
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
