<script lang="ts">
	import { type DownloadQueue, formatDate } from './episodes';

	let {
		downloads,
		onremove,
		ondismiss,
	}: {
		downloads: DownloadQueue;
		/** Takes an episode id. */
		onremove: (id: string) => void;
		ondismiss: () => void;
	} = $props();
</script>

{#if downloads.current || downloads.waiting.length || downloads.failed}
	<table>
		<thead>
			<tr>
				<th>Date</th>
				<th>Show</th>
				<th>Title</th>
				<th></th>
			</tr>
		</thead>
		<tbody>
			<!-- The running download has no remove button, since it can't be cancelled -->
			{#if downloads.current}
				<tr>
					<td>{formatDate(downloads.current.date)}</td>
					<td>{downloads.current.showTitle}</td>
					<td>{downloads.current.title}</td>
					<td>
						<progress max="100" value={downloads.percent ?? undefined}></progress>
						{downloads.percent === null ? 'Downloading…' : `${downloads.percent}%`}
					</td>
				</tr>
			{/if}
			{#each downloads.waiting as episode (episode.id)}
				<tr>
					<td>{formatDate(episode.date)}</td>
					<td>{episode.showTitle}</td>
					<td>{episode.title}</td>
					<td><button onclick={() => onremove(episode.id)}>Remove</button></td>
				</tr>
			{/each}
			{#if downloads.failed}
				<tr class="failed">
					<td>{formatDate(downloads.failed.date)}</td>
					<td>{downloads.failed.showTitle}</td>
					<td>{downloads.failed.title}</td>
					<td>Failed <button onclick={ondismiss}>Dismiss</button></td>
				</tr>
			{/if}
		</tbody>
	</table>
{:else}
	<p>The download queue is empty</p>
{/if}

<style>
	table {
		width: 100%;
		border-collapse: collapse;
		text-transform: uppercase;
	}

	th,
	td {
		padding: 0.25rem 1ch;
		text-align: left;
		white-space: nowrap;
	}

	.failed {
		color: var(--accent);
	}

	p {
		text-transform: uppercase;
		color: var(--muted);
	}
</style>
