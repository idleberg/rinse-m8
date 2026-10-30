<script lang="ts">
	import { invoke } from '@tauri-apps/api/core';

	type Episode = {
		id: string;
		title: string;
		showId: string;
		showSlug: string;
		showTitle: string;
		station: string;
		/** London date, `YYYY-MM-DD`. */
		date: string;
		/** London time, `HH:MM`. */
		time: string;
		length: number;
		rebroadcast: boolean;
		genres: string[];
		mp3: string | null;
	};

	let episodes = $state<Episode[]>([]);
	let error = $state('');

	invoke<Episode[]>('get_episodes')
		.then((list) => {
			episodes = list.sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
		})
		.catch((e) => {
			error = String(e);
		});
</script>

<main>
	{#if error}
		<p role="alert">{error}</p>
	{/if}

	<table>
		<thead>
			<tr>
				<th>Date</th>
				<th>Time</th>
				<th>Station</th>
				<th>Show</th>
				<th>Title</th>
				<th></th>
			</tr>
		</thead>
		<tbody>
			{#each episodes as episode (episode.id)}
				<tr>
					<td>{episode.date}</td>
					<td>{episode.time}</td>
					<td>{episode.station}</td>
					<td>{episode.showTitle}</td>
					<td>{episode.title}</td>
					<td>
						{#if episode.rebroadcast}
							<span class="badge">Rebroadcast</span>
						{/if}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</main>

<style>
	main {
		padding: 1rem;
		font-family: system-ui, sans-serif;
	}

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

	.badge {
		padding: 0 0.4rem;
		border-radius: 0.25rem;
		background: #ddd;
		font-size: 0.8em;
	}
</style>
