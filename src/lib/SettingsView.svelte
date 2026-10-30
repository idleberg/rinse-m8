<script lang="ts">
	let {
		downloadFolder,
		autoDownload = $bindable(),
		onchoosefolder,
		onautodownloadchange,
	}: {
		downloadFolder: string | null;
		autoDownload: boolean;
		onchoosefolder: () => void;
		/** Called after the bound checkbox has changed. */
		onautodownloadchange: () => void;
	} = $props();
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
