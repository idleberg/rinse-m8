<script lang="ts">
	import type { Episode } from './episodes';

	let {
		episodes,
		subscribed,
		downloading,
		subscribing,
		ondownload,
		onopenshow,
		ontogglesubscription,
	}: {
		episodes: Episode[];
		/** Show slugs. */
		subscribed: string[];
		/** Episode ids. */
		downloading: string[];
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
			<th>Time</th>
			<th>Station</th>
			<th>Show</th>
			<th>Title</th>
			<th></th>
			<th></th>
			<th></th>
		</tr>
	</thead>
	<tbody>
		{#each episodes as episode (episode.id)}
			<tr>
				<td>{episode.date}</td>
				<td>{episode.time}</td>
				<td>{episode.station}</td>
				<td><button class="link" onclick={() => onopenshow(episode)}>{episode.showTitle}</button></td>
				<td>{episode.title}</td>
				<td>
					{#if episode.rebroadcast}
						<span class="badge">Rebroadcast</span>
					{/if}
				</td>
				<td>
					{#if episode.mp3}
						<button disabled={downloading.includes(episode.id)} onclick={() => ondownload(episode)}>
							{downloading.includes(episode.id) ? 'Downloading…' : 'Download'}
						</button>
					{/if}
				</td>
				<td>
					<button
						aria-pressed={subscribed.includes(episode.showSlug)}
						disabled={subscribing.includes(episode.showSlug)}
						onclick={() => ontogglesubscription(episode)}
					>
						{subscribed.includes(episode.showSlug) ? 'Unsubscribe' : 'Subscribe'}
					</button>
				</td>
			</tr>
		{/each}
	</tbody>
</table>

<style>
	table {
		width: 100%;
		border-collapse: collapse;
	}

	th,
	td {
		padding: 0.25rem 0.5rem;
		text-align: left;
		white-space: nowrap;
	}

	tbody tr:nth-child(odd) {
		background: #f4f4f4;
	}

	.link {
		border: none;
		padding: 0;
		background: none;
		color: inherit;
		font: inherit;
		text-decoration: underline;
		cursor: pointer;
	}

	.badge {
		padding: 0 0.4rem;
		border-radius: 0.25rem;
		background: #ddd;
		font-size: 0.8em;
	}
</style>
