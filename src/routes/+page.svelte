<script lang="ts">
	import { invoke } from '@tauri-apps/api/core';
	import { open } from '@tauri-apps/plugin-dialog';
	import { load } from '@tauri-apps/plugin-store';

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

	const stations = ['Rinse FM', 'Rinse FR', 'Kool FM', 'SWU FM'];

	let episodes = $state<Episode[]>([]);
	let error = $state('');

	let shownStations = $state([...stations]);
	let mp3Only = $state(true);
	let hideRebroadcasts = $state(false);
	let search = $state('');

	const visibleEpisodes = $derived.by(() => {
		const query = search.trim().toLowerCase();

		// Stations without a checkbox stay visible rather than unreachable
		return episodes.filter(
			(episode) =>
				(!stations.includes(episode.station) || shownStations.includes(episode.station)) &&
				(!mp3Only || episode.mp3) &&
				(!hideRebroadcasts || !episode.rebroadcast) &&
				[episode.title, episode.showTitle, ...episode.genres].some((text) => text.toLowerCase().includes(query)),
		);
	});

	let downloading = $state<string[]>([]);

	async function download(episode: Episode) {
		error = '';

		const settings = await load('settings.json');

		if (!(await settings.get<string>('downloadFolder'))) {
			const folder = await open({ directory: true, title: 'Choose a download folder' });

			if (!folder) {
				return;
			}

			await settings.set('downloadFolder', folder);
			await settings.save();
		}

		downloading.push(episode.id);

		try {
			await invoke('download', { episode });
		} finally {
			downloading = downloading.filter((id) => id !== episode.id);
		}
	}

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

	<fieldset aria-label="Filters">
		{#each stations as station (station)}
			<label><input type="checkbox" bind:group={shownStations} value={station} /> {station}</label>
		{/each}
		<label><input type="checkbox" bind:checked={mp3Only} /> mp3 available only</label>
		<label><input type="checkbox" bind:checked={hideRebroadcasts} /> hide rebroadcasts</label>
		<input type="search" bind:value={search} placeholder="Search title, show, genres" aria-label="Search" />
	</fieldset>

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
			</tr>
		</thead>
		<tbody>
			{#each visibleEpisodes as episode (episode.id)}
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
					<td>
						{#if episode.mp3}
							<button
								disabled={downloading.includes(episode.id)}
								onclick={() =>
									download(episode).catch((e) => {
										error = String(e);
									})}
							>
								{downloading.includes(episode.id) ? 'Downloading…' : 'Download'}
							</button>
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

	fieldset {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1rem;
		align-items: center;
		margin: 0 0 1rem;
		border: none;
		padding: 0;
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
