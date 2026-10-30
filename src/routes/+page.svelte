<script lang="ts">
	import { invoke } from '@tauri-apps/api/core';
	import { listen } from '@tauri-apps/api/event';
	import { open } from '@tauri-apps/plugin-dialog';
	import DownloadStatus from '../lib/DownloadStatus.svelte';
	import EpisodeFilters from '../lib/EpisodeFilters.svelte';
	import EpisodeTable from '../lib/EpisodeTable.svelte';
	import ShowSection from '../lib/ShowSection.svelte';
	import ShowView from '../lib/ShowView.svelte';
	import ThemeToggle from '../lib/ThemeToggle.svelte';
	import { type DownloadQueue, type Episode, type Show, type ShowDetails, type ShowPage, showOf, stations } from '../lib/episodes';

	type Settings = {
		subscriptions: Show[];
		seen: string[];
		downloadFolder: string | null;
		autoDownload: boolean;
	};

	let episodes = $state<Episode[]>([]);
	let error = $state('');

	let shownStations = $state([...stations]);
	let mp3Only = $state(true);
	let hideRebroadcasts = $state(false);
	let search = $state('');
	let showDownloaded = $state(false);

	let settings = $state<Settings>({ subscriptions: [], seen: [], downloadFolder: null, autoDownload: false });
	const subscribed = $derived(settings.subscriptions.map((s) => s.slug));

	const filteredEpisodes = $derived.by(() => {
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

	const showSections = $derived(
		settings.subscriptions.map((show) => ({
			show,
			episodes: filteredEpisodes.filter(
				(episode) =>
					episode.showSlug === show.slug && (showDownloaded || !downloads.downloaded.includes(episode.id)),
			),
		})),
	);
	const scheduleEpisodes = $derived(filteredEpisodes.filter((episode) => episode.scheduled));

	let downloads = $state<DownloadQueue>({ current: null, percent: null, waiting: [], failed: null, downloaded: [] });

	/** Queues the episode, asking for a download folder first if none is set. */
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

		await invoke('download', { episode });
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

	let view = $state<'dashboard' | 'schedule'>('dashboard');
	let openedShow = $state<Show | null>(null);

	/** Of `openedShow`, once its fetch has returned. */
	let showDetails = $state<ShowDetails | null>(null);
	let refreshing = $state<string[]>([]);

	/** Shows the cached episodes at once, then merges the show's fetched episodes in. */
	async function openShow(show: Show) {
		error = '';
		openedShow = show;
		showDetails = null;

		refreshing.push(show.slug);

		// ponytail: the reply replaces the whole list, so a poller update landing mid-fetch is undone until the next one
		try {
			const page = await invoke<ShowPage>('refresh_show', { slug: show.slug });

			setEpisodes(page.episodes);

			if (openedShow?.slug === show.slug) {
				showDetails = page.details;
			}
		} finally {
			refreshing = refreshing.filter((s) => s !== show.slug);
		}
	}

	let subscribing = $state<string[]>([]);

	async function toggleSubscription(show: Show) {
		error = '';

		subscribing.push(show.slug);

		try {
			settings = subscribed.includes(show.slug)
				? await invoke<Settings>('unsubscribe', { slug: show.slug })
				: await invoke<Settings>('subscribe', { slug: show.slug, title: show.title });
		} finally {
			subscribing = subscribing.filter((s) => s !== show.slug);
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

	invoke<DownloadQueue>('get_download_queue')
		.then((loaded) => {
			downloads = loaded;
		})
		.catch(showError);

	listen<DownloadQueue>('download-queue', (event) => {
		downloads = event.payload;
	});
</script>

<nav>
	<div>
		{#each [['dashboard', 'Dashboard'], ['schedule', 'Schedule']] as const as [value, label] (value)}
			<button
				aria-current={!openedShow && view === value ? 'page' : undefined}
				onclick={() => {
					view = value;
					openedShow = null;
				}}>{label}</button
			>
		{/each}
	</div>
	<ThemeToggle />
</nav>

<main>
	{#if error}
		<p role="alert">{error}</p>
	{/if}

	{#if openedShow}
		<!-- Keyed so opening another show from its table starts with fresh filters -->
		{#key openedShow.slug}
			<ShowView
				show={openedShow}
				details={showDetails}
				refreshing={refreshing.includes(openedShow.slug)}
				{episodes}
				{subscribed}
				{downloads}
				{subscribing}
				ondownload={(episode) => download(episode).catch(showError)}
				onopenshow={(episode) => openShow(showOf(episode)).catch(showError)}
				ontogglesubscription={(show) => toggleSubscription(show).catch(showError)}
				onback={() => (openedShow = null)}
			/>
		{/key}
	{:else}
		<EpisodeFilters bind:shownStations bind:mp3Only bind:hideRebroadcasts bind:search>
			{#if view === 'dashboard'}
				<label>
					<input
						type="checkbox"
						bind:checked={settings.autoDownload}
						onchange={() => saveAutoDownload().catch(showError)}
					/>
					auto-download
				</label>
				<label>
					<input type="checkbox" bind:checked={showDownloaded} />
					show downloaded
				</label>
			{/if}
		</EpisodeFilters>

		{#if view === 'dashboard'}
			{#each showSections as section (section.show.slug)}
				<ShowSection
					show={section.show}
					episodes={section.episodes}
					{subscribed}
					{downloads}
					{subscribing}
					ondownload={(episode) => download(episode).catch(showError)}
					onopenshow={(show) => openShow(show).catch(showError)}
					ontogglesubscription={(show) => toggleSubscription(show).catch(showError)}
				/>
			{:else}
				<p>
					Subscribe to a show from the
					<a
						href="#schedule"
						onclick={(event) => {
							event.preventDefault();
							view = 'schedule';
						}}>schedule</a
					>
					to see its episodes here
				</p>
			{/each}
		{:else}
			<EpisodeTable
				episodes={scheduleEpisodes}
				{subscribed}
				{downloads}
				{subscribing}
				ondownload={(episode) => download(episode).catch(showError)}
				onopenshow={(episode) => openShow(showOf(episode)).catch(showError)}
				ontogglesubscription={(episode) => toggleSubscription(showOf(episode)).catch(showError)}
			/>
		{/if}
	{/if}
</main>

<DownloadStatus {downloads} ondismiss={() => invoke('dismiss_download_failure').catch(showError)} />

<style>
	nav {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 0.5rem;
		border-bottom: 1px solid currentColor;
		padding: 0.5rem 1rem;
	}

	main {
		padding: 1rem;
	}

	nav div {
		display: flex;
		gap: 0.5rem;
	}
</style>
