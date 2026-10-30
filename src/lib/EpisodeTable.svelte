<script lang="ts">
	import DownloadButton from './DownloadButton.svelte';
	import SubscribeButton from './SubscribeButton.svelte';
	import { type DownloadQueue, type Episode, formatDate } from './episodes';

	let {
		episodes,
		subscribed,
		downloads,
		subscribing,
		ondownload,
		onopenshow,
		ontogglesubscription,
	}: {
		episodes: Episode[];
		/** Show slugs. */
		subscribed: string[];
		downloads: DownloadQueue;
		/** Show slugs. */
		subscribing: string[];
		ondownload: (episode: Episode) => void;
		onopenshow: (episode: Episode) => void;
		ontogglesubscription: (episode: Episode) => void;
	} = $props();
</script>

<table>
	<thead>
		<tr>
			<th>Date</th>
			<th>Station</th>
			<th>Show</th>
			<th>Title</th>
			<th></th>
			<th></th>
		</tr>
	</thead>
	<tbody>
		{#each episodes as episode (episode.id)}
			<tr>
				<td>{formatDate(episode.date)}</td>
				<td>{episode.station}</td>
				<td><button class="link" onclick={() => onopenshow(episode)}>{episode.showTitle}</button></td>
				<td>{episode.title}</td>
				<td>
					{#if episode.rebroadcast}
						<span class="badge">Rebroadcast</span>
					{/if}
				</td>
				<td>
					<div class="actions">
						{#if episode.mp3}
							<DownloadButton {episode} {downloads} {ondownload} />
						{/if}
						<SubscribeButton
							subscribed={subscribed.includes(episode.showSlug)}
							disabled={subscribing.includes(episode.showSlug)}
							onclick={() => ontogglesubscription(episode)}
						/>
					</div>
				</td>
			</tr>
		{/each}
	</tbody>
</table>

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

	th {
		border-bottom: 1px solid currentColor;
		font-weight: 700;
	}

	/* A row of `-` characters: a 1ch-wide tile, mostly dash, repeated along the bottom edge */
	td {
		background: linear-gradient(to right, var(--muted) 60%, transparent 0) left bottom / 1ch 1px repeat-x;
	}

	.link {
		border: none;
		padding: 0;
		text-align: left;
		text-decoration: underline;
	}

	.actions {
		display: flex;
		gap: 0.5ch;
		justify-content: flex-end;
		align-items: center;
	}

	.badge {
		color: var(--accent);
	}
</style>
