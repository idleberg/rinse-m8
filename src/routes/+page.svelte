<script lang="ts">
	import { invoke } from '@tauri-apps/api/core';
	import { listen } from '@tauri-apps/api/event';
	import { open } from '@tauri-apps/plugin-dialog';
	import DownloadStatus from '../lib/DownloadStatus.svelte';
	import EpisodeFilters from '../lib/EpisodeFilters.svelte';
	import EpisodeTable from '../lib/EpisodeTable.svelte';
	import { available, type DirectoryShow, type DownloadQueue, dead, type Episode, type Show, type ShowDetails, type ShowPage, showOf, stations } from '../lib/episodes';
	import Player from '../lib/Player.svelte';
	import QueueView from '../lib/QueueView.svelte';
	import SettingsView from '../lib/SettingsView.svelte';
	import ShowDirectory from '../lib/ShowDirectory.svelte';
	import ShowSection from '../lib/ShowSection.svelte';
	import ShowView from '../lib/ShowView.svelte';

	interface Settings {
		subscriptions: Show[];
		seen: string[];
		downloadFolder: string | null;
		autoDownload: boolean;
		keepRunning: boolean;
		/** In hours. */
		updateInterval: number;
	}

	let episodes = $state<Episode[]>([]);
	/** True until the first episode fetch settles, so an empty list isn't mistaken for filtered out. */
	let loadingEpisodes = $state(true);
	let errorMessage = $state('');

	// The checkboxes are remembered across restarts, the search isn't
	let savedFilters: { shownStations?: string[]; mp3Only?: boolean; hideRebroadcasts?: boolean } = {};

	try {
		savedFilters = JSON.parse(localStorage.getItem('filters') ?? '{}');
	} catch {
		// Unreadable filters fall back to the defaults
	}

	let shownStations = $state(savedFilters.shownStations ?? [...stations]);
	let mp3Only = $state(savedFilters.mp3Only ?? true);
	let hideRebroadcasts = $state(savedFilters.hideRebroadcasts ?? false);
	let search = $state('');
	let showDownloaded = $state(false);

	$effect(() => {
		localStorage.setItem('filters', JSON.stringify({ shownStations, mp3Only, hideRebroadcasts }));
	});

	let settings = $state<Settings>({ subscriptions: [], seen: [], downloadFolder: null, autoDownload: false, keepRunning: true, updateInterval: 6 });
	const subscribed = $derived(settings.subscriptions.map((s) => s.slug));

	const filteredEpisodes = $derived.by(() => {
		const query = search.trim().toLowerCase();

		// Stations without a checkbox stay visible rather than unreachable
		return episodes.filter(
			(episode) =>
				(!stations.includes(episode.station) || shownStations.includes(episode.station)) &&
				(!mp3Only || available(episode)) &&
				(!(hideRebroadcasts && episode.rebroadcast)) &&
				[episode.title, episode.showTitle, episode.displayTitle ?? '', ...episode.genres].some((text) => text.toLowerCase().includes(query)),
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

	/** The newest filtered episode of each subscribed show, newest first. */
	const latestEpisodes = $derived.by(() => {
		const seen = new Set<string>();

		// The latest is picked before the downloaded check, so an older episode doesn't stand in for it
		return filteredEpisodes.filter((episode) => {
			if (!subscribed.includes(episode.showSlug) || seen.has(episode.showSlug)) {
				return false;
			}

			seen.add(episode.showSlug);

			return showDownloaded || !downloads.downloaded.includes(episode.id);
		});
	});
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

	let player = $state<ReturnType<typeof Player>>();
	let playing = $state<string | null>(null);

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
		errorMessage = '';

		if (!(settings.downloadFolder || (await chooseFolder()))) {
			return;
		}

		await invoke('download', { episode });
	}

	/** Dead episodes are dropped here, so no table shows them, whatever the filters. */
	function setEpisodes(list: Episode[]) {
		episodes = list.filter((episode) => !dead(episode)).sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
	}

	/** Saves a checkbox bound to `settings`, and unticks it again if saving fails. */
	async function saveCheckbox(key: 'autoDownload' | 'keepRunning') {
		errorMessage = '';

		try {
			await invoke('set_settings', { patch: { [key]: settings[key] } });
		} catch (e) {
			settings[key] = !settings[key];
			throw e;
		}
	}

	/** Saves the update interval, and puts the stored one back if saving fails. */
	async function saveUpdateInterval(hours: number) {
		const stored = settings.updateInterval;

		errorMessage = '';
		settings.updateInterval = hours;

		try {
			await invoke('set_settings', { patch: { updateInterval: hours } });
		} catch (e) {
			settings.updateInterval = stored;
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
		errorMessage = '';

		// Reopening the open show, as a notification click can, keeps its details on screen while they refresh
		if (openedShow?.slug !== show.slug) {
			showDetails = null;
		}

		openedShow = show;

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
		errorMessage = '';

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
		errorMessage = '';

		await invoke('clear_image_cache');
		imageCacheSize = 0;
	}

	let lastfm = $state<{ user: string | null } | null>(null);
	let connectingLastfm = $state(false);

	/** Resolves once the user approves on Last.fm, or fails when approval times out. */
	async function connectLastfm() {
		errorMessage = '';
		connectingLastfm = true;

		try {
			lastfm = { user: await invoke<string>('connect_lastfm') };
		} finally {
			connectingLastfm = false;
		}
	}

	async function disconnectLastfm() {
		errorMessage = '';

		await invoke('disconnect_lastfm');
		lastfm = { user: null };
	}

	async function dismissFailure() {
		await invoke('dismiss_download_failure');
	}

	function showError(e: unknown) {
		errorMessage = String(e);
	}

	invoke<Settings>('get_settings')
		.then((loaded) => {
			settings = loaded;
		})
		.catch(showError);

	invoke<{ user: string | null } | null>('get_lastfm')
		.then((loaded) => {
			lastfm = loaded;
		})
		.catch(showError);

	// Sent when Last.fm rejects the session, for example after the user revoked access
	listen('lastfm-disconnected', () => {
		lastfm = { user: null };
	});

	invoke<Episode[]>('get_episodes')
		.then(setEpisodes)
		.catch(showError)
		.finally(() => {
			loadingEpisodes = false;
		});

	// The poller sends the whole cache after each update
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

	// A click on a new-episode notification opens its show, refetched so the new episode is listed
	listen<Show>('open-show', (event) => openShow(event.payload).catch(showError));

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
		{#each [['dashboard', 'My Shows'], ['schedule', 'Schedule'], ['shows', 'Shows'], ['queue', 'Downloads']] as const as [value, label] (value)}
			<button type="button" aria-current={!openedShow && view === value ? 'page' : undefined} onclick={() => openView(value)}
				>{label}</button
			>
		{/each}
	</div>
	<!-- Feather's "sliders" icon -->
	<button type="button" class="icon" aria-label="Settings" title="Settings" aria-current={!openedShow && view === 'settings' ? 'page' : undefined} onclick={() => openView('settings')}>
		<svg viewBox="0 0 24 24" aria-hidden="true">
			<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />
		</svg>
	</button>
</nav>

<!-- Settings swap light and dark, to stand apart from the other pages -->
<main class:inverted={view === 'settings' && !openedShow}>
	{#if errorMessage}
		<p role="alert">
			{errorMessage}
			<button type="button" class="icon" aria-label="Dismiss" title="Dismiss" onclick={() => {
					errorMessage = '';
				}}>
				<svg viewBox="0 0 16 16" aria-hidden="true">
					<path d="M4 4l8 8M12 4l-8 8" />
				</svg>
			</button>
		</p>
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
				{playing}
				onplay={(episode) => player?.play(episode).catch(showError)}
				onpause={() => player?.pause()}
				ondownload={(episode) => download(episode).catch(showError)}
				onopenshow={(episode) => openShow(showOf(episode)).catch(showError)}
				ontogglesubscription={(show) => toggleSubscription(show).catch(showError)}
				onback={() => {
					openedShow = null;
				}}
			/>
		{/key}
	{:else if view === 'queue'}
		<QueueView
			{downloads}
			onremove={(id) => invoke('remove_download', { id }).catch(showError)}
			onmove={(id, index) => invoke('move_download', { id, index }).catch(showError)}
			oncancel={() => invoke('cancel_download').catch(showError)}
			ondismiss={() => dismissFailure().catch(showError)}
			onerror={showError}
		/>
	{:else if view === 'settings'}
		<SettingsView
			downloadFolder={settings.downloadFolder}
			bind:autoDownload={settings.autoDownload}
			bind:keepRunning={settings.keepRunning}
			onchoosefolder={() => {
				errorMessage = '';
				chooseFolder().catch(showError);
			}}
			onautodownloadchange={() => saveCheckbox('autoDownload').catch(showError)}
			onkeeprunningchange={() => saveCheckbox('keepRunning').catch(showError)}
			updateInterval={settings.updateInterval}
			onupdateintervalchange={(hours) => saveUpdateInterval(hours).catch(showError)}
			{imageCacheSize}
			onclearimagecache={() => clearImageCache().catch(showError)}
			{lastfm}
			{connectingLastfm}
			onconnectlastfm={() => connectLastfm().catch(showError)}
			ondisconnectlastfm={() => disconnectLastfm().catch(showError)}
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
			{#if settings.subscriptions.length}
				<section class="latest">
					<h2>Latest</h2>
					{#if latestEpisodes.length}
						<EpisodeTable
							episodes={latestEpisodes}
							{subscribed}
							{downloads}
							{subscribing}
							{playing}
							onplay={(episode) => player?.play(episode).catch(showError)}
							onpause={() => player?.pause()}
							ondownload={(episode) => download(episode).catch(showError)}
							onmark={(episode) => invoke('mark_downloaded', { id: episode.id }).catch(showError)}
							onopenshow={(episode) => openShow(showOf(episode)).catch(showError)}
							ontogglesubscription={(episode) => toggleSubscription(showOf(episode)).catch(showError)}
							subscribeOnHover
						/>
					{:else if loadingEpisodes}
						<p role="status">Loading episodes…</p>
					{:else}
						<p>No episodes match the filters</p>
					{/if}
				</section>
			{/if}

			<!-- The else only covers having no subscriptions, a show whose episodes are all filtered out is hidden -->
			{#each showSections as section (section.show.slug)}
				{#if section.episodes.length}
					<ShowSection
						show={section.show}
						episodes={section.episodes}
						{subscribed}
						{downloads}
						{subscribing}
						{playing}
						onplay={(episode) => player?.play(episode).catch(showError)}
						onpause={() => player?.pause()}
						ondownload={(episode) => download(episode).catch(showError)}
						onmark={(episode) => invoke('mark_downloaded', { id: episode.id }).catch(showError)}
						onopenshow={(show) => openShow(show).catch(showError)}
						ontogglesubscription={(show) => toggleSubscription(show).catch(showError)}
					/>
				{/if}
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
		{:else if scheduleEpisodes.length}
			<EpisodeTable
				episodes={scheduleEpisodes}
				{subscribed}
				{downloads}
				{subscribing}
				{playing}
				onplay={(episode) => player?.play(episode).catch(showError)}
				onpause={() => player?.pause()}
				ondownload={(episode) => download(episode).catch(showError)}
				onopenshow={(episode) => openShow(showOf(episode)).catch(showError)}
				ontogglesubscription={(episode) => toggleSubscription(showOf(episode)).catch(showError)}
			/>
		{:else if loadingEpisodes}
			<p class="empty" role="status">Loading episodes…</p>
		{:else}
			<p class="empty">No episodes match the filters</p>
		{/if}
	{/if}
</main>

<div class="bars">
	<DownloadStatus
		{downloads}
		oncancel={() => invoke('cancel_download').catch(showError)}
		ondismiss={() => dismissFailure().catch(showError)}
		onviewqueue={() => openView('queue')}
	/>
	<Player bind:this={player} bind:playing {episodes} onerror={showError} />
</div>

<style>
	/* Pinned to the top of the window while the page scrolls under it */
	nav {
		position: sticky;
		top: 0;
		z-index: 1;
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 0.5rem;
		border-bottom: 1px solid currentColor;
		padding: 0.5rem 1rem;
		background: var(--paper);
	}

	main {
		padding: 1rem;
	}

	/* Fills the window below the nav, so the swapped background doesn't stop short */
	main.inverted {
		flex: 1;
	}

	.bars {
		position: sticky;
		bottom: 0;
		margin-top: auto;
	}

	nav div {
		display: flex;
		gap: 0.5rem;
	}

	/* Matches the show sections below it */
	.latest {
		margin: 0 0 2rem;
	}

	.latest h2 {
		margin: 0 0 0.5rem;
		font-size: 1.25rem;
		text-transform: uppercase;
	}

	.latest p,
	.empty {
		text-transform: uppercase;
		color: var(--muted);
	}

	[role='alert'] {
		display: flex;
		gap: 1rem;
		align-items: center;
		justify-content: space-between;
		margin: 0 0 1rem;
		padding: 0.5rem 1rem;
		background: var(--accent);
		color: white;
	}
</style>
