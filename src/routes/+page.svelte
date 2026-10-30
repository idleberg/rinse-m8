<script lang="ts">
	import { invoke } from '@tauri-apps/api/core';
	import { listen } from '@tauri-apps/api/event';
	import { open } from '@tauri-apps/plugin-dialog';
	import EpisodeFilters from '../lib/EpisodeFilters.svelte';
	import EpisodeTable from '../lib/EpisodeTable.svelte';
	import { type Episode, stations } from '../lib/episodes';

	type Settings = {
		subscriptions: { slug: string; title: string }[];
		seen: string[];
		downloadFolder: string | null;
		autoDownload: boolean;
	};

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

	function showError(e: unknown) {
		error = String(e);
	}

	invoke<Settings>('get_settings')
		.then((loaded) => {
			settings = loaded;
		})
		.catch(showError);

	invoke<Episode[]>('get_episodes')
		.then(setEpisodes)
		.catch(showError);

	// The subscription poller sends the whole cache after each check
	listen<Episode[]>('episodes-updated', (event) => setEpisodes(event.payload));
</script>

<main>
	{#if error}
		<p role="alert">{error}</p>
	{/if}

	<EpisodeFilters bind:shownStations bind:mp3Only bind:hideRebroadcasts bind:subscribedOnly bind:search />

	<fieldset aria-label="Settings">
		<label>
			<input
				type="checkbox"
				bind:checked={settings.autoDownload}
				onchange={() => saveAutoDownload().catch(showError)}
			/>
			auto-download new episodes of subscribed shows
		</label>
	</fieldset>

	<EpisodeTable
		episodes={visibleEpisodes}
		{subscribed}
		{downloading}
		{refreshing}
		{subscribing}
		ondownload={(episode) => download(episode).catch(showError)}
		onrefresh={(episode) => refreshShow(episode.showSlug).catch(showError)}
		ontogglesubscription={(episode) => toggleSubscription(episode).catch(showError)}
	/>
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
</style>
