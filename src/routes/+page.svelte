<script lang="ts">
	import { invoke } from '@tauri-apps/api/core';
	import { listen } from '@tauri-apps/api/event';
	import { open } from '@tauri-apps/plugin-dialog';

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

	type Settings = {
		subscriptions: { slug: string; title: string }[];
		seen: string[];
		downloadFolder: string | null;
		autoDownload: boolean;
	};

	const stations = ['Rinse FM', 'Rinse FR', 'Kool FM', 'SWU FM'];

	let episodes = $state<Episode[]>([]);
	let error = $state('');

	let shownStations = $state([...stations]);
	let mp3Only = $state(true);
	let hideRebroadcasts = $state(false);
	let subscribedOnly = $state(false);
	let search = $state('');

	let settings = $state<Settings>({ subscriptions: [], seen: [], downloadFolder: null, autoDownload: false });
	const subscribed = $derived(settings.subscriptions.map((s) => s.slug));

	const visibleEpisodes = $derived.by(() => {
		const query = search.trim().toLowerCase();

		// Stations without a checkbox stay visible rather than unreachable
		return episodes.filter(
			(episode) =>
				(!stations.includes(episode.station) || shownStations.includes(episode.station)) &&
				(!mp3Only || episode.mp3) &&
				(!hideRebroadcasts || !episode.rebroadcast) &&
				(!subscribedOnly || subscribed.includes(episode.showSlug)) &&
				[episode.title, episode.showTitle, ...episode.genres].some((text) => text.toLowerCase().includes(query)),
		);
	});

	let downloading = $state<string[]>([]);

	async function download(episode: Episode) {
		error = '';

		if (!settings.downloadFolder) {
			const folder = await open({ directory: true, title: 'Choose a download folder' });

			if (!folder) {
				return;
			}

			await invoke('set_settings', { patch: { downloadFolder: folder } });
			settings.downloadFolder = folder;
		}

		downloading.push(episode.id);

		try {
			await invoke('download', { episode });
		} finally {
			downloading = downloading.filter((id) => id !== episode.id);
		}
	}

	function setEpisodes(list: Episode[]) {
		episodes = list.sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
	}

	/** Saves the checkbox, which is bound to `settings`, and unticks it again if saving fails. */
	async function saveAutoDownload() {
		error = '';

		try {
			await invoke('set_settings', { patch: { autoDownload: settings.autoDownload } });
		} catch (e) {
			settings.autoDownload = !settings.autoDownload;
			throw e;
		}
	}

	let refreshing = $state<string[]>([]);

	async function refreshShow(slug: string) {
		error = '';

		refreshing.push(slug);

		try {
			setEpisodes(await invoke<Episode[]>('refresh_show', { slug }));
		} finally {
			refreshing = refreshing.filter((s) => s !== slug);
		}
	}

	let subscribing = $state<string[]>([]);

	async function toggleSubscription(episode: Episode) {
		error = '';

		subscribing.push(episode.showSlug);

		try {
			settings = subscribed.includes(episode.showSlug)
				? await invoke<Settings>('unsubscribe', { slug: episode.showSlug })
				: await invoke<Settings>('subscribe', { slug: episode.showSlug, title: episode.showTitle });
		} finally {
			subscribing = subscribing.filter((s) => s !== episode.showSlug);
		}
	}

	invoke<Settings>('get_settings')
		.then((loaded) => {
			settings = loaded;
		})
		.catch((e) => {
			error = String(e);
		});

	invoke<Episode[]>('get_episodes')
		.then(setEpisodes)
		.catch((e) => {
			error = String(e);
		});

	// The subscription poller sends the whole cache after each check
	listen<Episode[]>('episodes-updated', (event) => setEpisodes(event.payload));
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
		<label><input type="checkbox" bind:checked={subscribedOnly} /> subscribed only</label>
		<input type="search" bind:value={search} placeholder="Search title, show, genres" aria-label="Search" />
	</fieldset>

	<fieldset aria-label="Settings">
		<label>
			<input
				type="checkbox"
				bind:checked={settings.autoDownload}
				onchange={() =>
					saveAutoDownload().catch((e) => {
						error = String(e);
					})}
			/>
			auto-download new episodes of subscribed shows
		</label>
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
					<td>
						<button
							disabled={refreshing.includes(episode.showSlug)}
							onclick={() =>
								refreshShow(episode.showSlug).catch((e) => {
									error = String(e);
								})}
						>
							{refreshing.includes(episode.showSlug) ? 'Refreshing…' : 'Refresh show'}
						</button>
					</td>
					<td>
						<button
							aria-pressed={subscribed.includes(episode.showSlug)}
							disabled={subscribing.includes(episode.showSlug)}
							onclick={() =>
								toggleSubscription(episode).catch((e) => {
									error = String(e);
								})}
						>
							{subscribed.includes(episode.showSlug) ? 'Unsubscribe' : 'Subscribe'}
						</button>
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
