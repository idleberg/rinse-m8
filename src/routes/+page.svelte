<script lang="ts">
	import { invoke } from '@tauri-apps/api/core';
	import { listen } from '@tauri-apps/api/event';
	import { open } from '@tauri-apps/plugin-dialog';
	import DownloadStatus from '../lib/DownloadStatus.svelte';
	import EpisodeFilters from '../lib/EpisodeFilters.svelte';
	import EpisodeTable from '../lib/EpisodeTable.svelte';
	import QueueView from '../lib/QueueView.svelte';
	import SettingsView from '../lib/SettingsView.svelte';
	import ShowDirectory from '../lib/ShowDirectory.svelte';
	import ShowSection from '../lib/ShowSection.svelte';
	import ShowView from '../lib/ShowView.svelte';
	import ThemeToggle from '../lib/ThemeToggle.svelte';
	import { type DirectoryShow, type DownloadQueue, type Episode, type Show, type ShowDetails, type ShowPage, showOf, stations } from '../lib/episodes';

	type Settings = {
		subscriptions: Show[];
		seen: string[];
		downloadFolder: string | null;
		autoDownload: boolean;
		keepRunning: boolean;
	};

	let episodes = $state<Episode[]>([]);
	let error = $state('');

	// The checkboxes are remembered across restarts, the search isn't
	let savedFilters: { shownStations?: string[]; mp3Only?: boolean; hideRebroadcasts?: boolean } = {};

	try {
		savedFilters = JSON.parse(localStorage.getItem('filters') ?? '{}');
	} catch {}

	let shownStations = $state(savedFilters.shownStations ?? [...stations]);
	let mp3Only = $state(savedFilters.mp3Only ?? true);
	let hideRebroadcasts = $state(savedFilters.hideRebroadcasts ?? false);
	let search = $state('');
	let showDownloaded = $state(false);

	$effect(() => {
		localStorage.setItem('filters', JSON.stringify({ shownStations, mp3Only, hideRebroadcasts }));
	});

	let settings = $state<Settings>({ subscriptions: [], seen: [], downloadFolder: null, autoDownload: false, keepRunning: true });
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

	/** Null until the first refresh finishes. */
	let directory = $state<DirectoryShow[] | null>(null);

	const filteredDirectory = $derived.by(() => {
		const query = search.trim().toLowerCase();

		return (
			directory?.filter(
				(show) =>
					(!stations.includes(show.station) || shownStations.includes(show.station)) &&
					[show.title, ...show.genres].some((text) => text.toLowerCase().includes(query)),
			) ?? null
		);
	});

	let downloads = $state<DownloadQueue>({ current: null, percent: null, waiting: [], failed: null, downloaded: [] });

	/** Asks for a download folder and saves it, returning false if the dialog was cancelled. */
	async function chooseFolder() {
		const folder = await open({
			directory: true,
			title: 'Choose a download folder',
			defaultPath: settings.downloadFolder ?? undefined,
		});

		if (!folder) {
			return false;
		}

		await invoke('set_settings', { patch: { downloadFolder: folder } });
		settings.downloadFolder = folder;

		return true;
	}

	/** Queues the episode, asking for a download folder first if none is set. */
	async function download(episode: Episode) {
		error = '';

		if (!settings.downloadFolder && !(await chooseFolder())) {
			return;
		}

		await invoke('download', { episode });
	}

	function setEpisodes(list: Episode[]) {
		episodes = list.sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
	}

	/** Saves a checkbox bound to `settings`, and unticks it again if saving fails. */
	async function saveCheckbox(key: 'autoDownload' | 'keepRunning') {
		error = '';

		try {
			await invoke('set_settings', { patch: { [key]: settings[key] } });
		} catch (e) {
			settings[key] = !settings[key];
			throw e;
		}
	}

	let view = $state<'dashboard' | 'schedule' | 'shows' | 'queue' | 'settings'>('dashboard');
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

	let imageCacheSize = $state<number | null>(null);

	function openView(value: typeof view) {
		view = value;
		openedShow = null;

		// Show views fill the cache, so it's measured afresh each time
		if (value === 'settings') {
			invoke<number>('get_image_cache_size')
				.then((size) => {
					imageCacheSize = size;
				})
				.catch(showError);
		}
	}

	/** Keeps the old size showing if clearing fails. */
	async function clearImageCache() {
		error = '';

		await invoke('clear_image_cache');
		imageCacheSize = 0;
	}

	async function dismissFailure() {
		await invoke('dismiss_download_failure');
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

	invoke<DirectoryShow[] | null>('get_show_directory')
		.then((loaded) => {
			directory ??= loaded;
		})
		.catch(showError);

	// The background refresh sends the whole directory once it has every page
	listen<DirectoryShow[]>('show-directory', (event) => {
		directory = event.payload;
	});
</script>

<!-- With Tauri's file drop off, a dropped file would otherwise open in the window -->
<svelte:window
	ondragover={(event) => event.dataTransfer?.types.includes('Files') && event.preventDefault()}
	ondrop={(event) => event.dataTransfer?.types.includes('Files') && event.preventDefault()}
/>

<nav>
	<div>
		{#each [['dashboard', 'Dashboard'], ['schedule', 'Schedule'], ['shows', 'Shows'], ['queue', 'Queue'], ['settings', 'Settings']] as const as [value, label] (value)}
			<button aria-current={!openedShow && view === value ? 'page' : undefined} onclick={() => openView(value)}
				>{label}</button
			>
		{/each}
	</div>
	<ThemeToggle />
</nav>

<!-- Settings swap light and dark, to stand apart from the other pages -->
<main class:inverted={view === 'settings' && !openedShow}>
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
	{:else if view === 'queue'}
		<QueueView
			{downloads}
			onremove={(id) => invoke('remove_download', { id }).catch(showError)}
			onmove={(id, index) => invoke('move_download', { id, index }).catch(showError)}
			oncancel={() => invoke('cancel_download').catch(showError)}
			ondismiss={() => dismissFailure().catch(showError)}
		/>
	{:else if view === 'settings'}
		<SettingsView
			downloadFolder={settings.downloadFolder}
			bind:autoDownload={settings.autoDownload}
			bind:keepRunning={settings.keepRunning}
			onchoosefolder={() => {
				error = '';
				chooseFolder().catch(showError);
			}}
			onautodownloadchange={() => saveCheckbox('autoDownload').catch(showError)}
			onkeeprunningchange={() => saveCheckbox('keepRunning').catch(showError)}
			{imageCacheSize}
			onclearimagecache={() => clearImageCache().catch(showError)}
		/>
	{:else if view === 'shows'}
		<EpisodeFilters bind:shownStations bind:search />

		<ShowDirectory
			shows={filteredDirectory}
			{subscribed}
			{subscribing}
			onopenshow={(show) => openShow(show).catch(showError)}
			ontogglesubscription={(show) => toggleSubscription(show).catch(showError)}
		/>
	{:else}
		<EpisodeFilters bind:shownStations bind:mp3Only bind:hideRebroadcasts bind:search>
			{#if view === 'dashboard'}
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
							openView('schedule');
						}}>schedule</a
					>
					or pick one from the
					<a
						href="#shows"
						onclick={(event) => {
							event.preventDefault();
							openView('shows');
						}}>shows</a
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

<DownloadStatus
	{downloads}
	ondismiss={() => dismissFailure().catch(showError)}
	onviewqueue={() => openView('queue')}
/>

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

	/* Fills the window below the nav, so the swapped background doesn't stop short */
	main.inverted {
		flex: 1;
	}

	nav div {
		display: flex;
		gap: 0.5rem;
	}

	[role='alert'] {
		margin: 0 0 1rem;
		padding: 0.5rem 1rem;
		background: var(--accent);
		color: #fff;
	}
</style>
