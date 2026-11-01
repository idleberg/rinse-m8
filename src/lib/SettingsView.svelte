<script lang="ts">
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
		onclearimagecache,
		onconnectlastfm,
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
		onclearimagecache: () => void;
		onconnectlastfm: () => void;
		ondisconnectlastfm: () => void;
	} = $props();

	/** In hours. */
	// biome-ignore lint/style/noMagicNumbers: the list is the menu's choices
	const updateIntervals = [1, 6, 12, 24, 48];
	/** In hours, where 0 checks only at launch. */
	// biome-ignore lint/style/noMagicNumbers: the list is the menu's choices
	const appUpdateIntervals = [0, 1, 6, 24];
	const bytesPerMegabyte = 1e6;
	const megabytes = new Intl.NumberFormat(undefined, { style: 'unit', unit: 'megabyte', maximumFractionDigits: 1, maximumSignificantDigits: 1, roundingPriority: 'morePrecision' });
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
	<dt>Updates</dt>
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
				<option value={hours}>{hours === 0 ? 'check at launch only' : `check every ${hours === 1 ? 'hour' : `${hours} hours`}`}</option>
			{/each}
		</select>
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
	{#if lastfm}
		<dt>Last.fm</dt>
		<dd>
			{#if connectingLastfm}
				<span class="muted">waiting for approval…</span>
			{:else if lastfm.user}
				connected as {lastfm.user}
				<button type="button" onclick={ondisconnectlastfm}>Disconnect</button>
			{:else}
				<button type="button" onclick={onconnectlastfm}>Connect</button>
			{/if}
		</dd>
	{/if}
</dl>

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

	.muted {
		color: var(--muted);
	}
</style>
