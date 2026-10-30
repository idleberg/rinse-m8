<script lang="ts">
	let {
		downloadFolder,
		autoDownload = $bindable(),
		keepRunning = $bindable(),
		imageCacheSize,
		onchoosefolder,
		onautodownloadchange,
		onkeeprunningchange,
		onclearimagecache,
	}: {
		downloadFolder: string | null;
		autoDownload: boolean;
		keepRunning: boolean;
		/** In bytes, or null until it has loaded. */
		imageCacheSize: number | null;
		onchoosefolder: () => void;
		/** Called after the bound checkbox has changed. */
		onautodownloadchange: () => void;
		/** Called after the bound checkbox has changed. */
		onkeeprunningchange: () => void;
		onclearimagecache: () => void;
	} = $props();

	const megabytes = new Intl.NumberFormat(undefined, { style: 'unit', unit: 'megabyte', maximumFractionDigits: 1, maximumSignificantDigits: 1, roundingPriority: 'morePrecision' });
</script>

<dl>
	<dt>Download folder</dt>
	<dd>
		{#if downloadFolder}
			<code>{downloadFolder}</code>
		{:else}
			<span class="muted">None set</span>
		{/if}
		<button onclick={onchoosefolder}>Change…</button>
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
	<dt>Image cache</dt>
	<dd>
		{#if imageCacheSize}
			{megabytes.format(imageCacheSize / 1e6)}
		{:else if imageCacheSize === 0}
			<span class="muted">Empty</span>
		{/if}
		<button onclick={onclearimagecache} disabled={!imageCacheSize}>Clear</button>
	</dd>
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
