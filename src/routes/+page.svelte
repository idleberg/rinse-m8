<script lang="ts">
	import { invoke } from '@tauri-apps/api/core';
	import { listen } from '@tauri-apps/api/event';
	import { open, save } from '@tauri-apps/plugin-dialog';
	import { relaunch } from '@tauri-apps/plugin-process';
	import { check, type Update } from '@tauri-apps/plugin-updater';
	import ConfirmDialog from '#lib/components/ConfirmDialog.svelte';
	import DownloadStatus from '#lib/components/DownloadStatus.svelte';
	import EpisodeFilters from '#lib/components/EpisodeFilters.svelte';
	import EpisodeTable from '#lib/components/EpisodeTable.svelte';
	import Player from '#lib/components/Player.svelte';
	import PlayerView from '#lib/components/PlayerView.svelte';
	import QueueView from '#lib/components/QueueView.svelte';
	import SettingsView from '#lib/components/SettingsView.svelte';
	import ShowDirectory from '#lib/components/ShowDirectory.svelte';
	import ShowSection from '#lib/components/ShowSection.svelte';
	import ShowView from '#lib/components/ShowView.svelte';
	import UpdateBanner from '#lib/components/UpdateBanner.svelte';
	import { available, type DirectoryShow, type DownloadQueue, dead, type Episode, monthsAgo, type Show, type ShowDetails, type ShowPage, showOf, stations } from '#lib/episodes';

	interface Settings {
		subscriptions: Show[];
		seen: string[];
		downloadFolder: string | null;
		autoDownload: boolean;
		keepRunning: boolean;
		/** In hours. */
		updateInterval: number;
		/** In hours, or 0 to check only at launch. */
		appUpdateInterval: number;
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

	let settings = $state<Settings>({ subscriptions: [], seen: [], downloadFolder: null, autoDownload: false, keepRunning: true, updateInterval: 6, appUpdateInterval: 24 });
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

	/** Keyed by show slug, refetched each time the Shows tab opens. */
	let lastAired = $state<Record<string, string>>({});

	/** Hides shows last aired more than this many months ago, or none when null. */
	let hideOlderThan = $state<number | null>(24);

	const filteredDirectory = $derived.by(() => {
		const query = search.trim().toLowerCase();
		const cutoff = hideOlderThan === null ? '' : monthsAgo(hideOlderThan);

		// A show without a known date is kept, as its age is unknown
		return (
			directory?.filter(
				(show) =>
					(!stations.includes(show.station) || shownStations.includes(show.station)) &&
					(!lastAired[show.slug] || lastAired[show.slug] >= cutoff) &&
					[show.title, ...show.genres].some((text) => text.toLowerCase().includes(query)),
			) ?? null
		);
	});

	let player = $state<ReturnType<typeof Player>>();
	let confirmDialog = $state<ReturnType<typeof ConfirmDialog>>();
	let playing = $state<string | null>(null);
	let queue = $state<Episode[]>([]);

	let downloads = $state<DownloadQueue>({ current: null, percent: null, waiting: [], failures: [], downloaded: [] });

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

	/** Queues the episode, asking for a download folder first if none is set. A failed one is retried, and the
	 * downloads view opens to show it. */
	async function download(episode: Episode) {
		errorMessage = '';

		if (!(settings.downloadFolder || (await chooseFolder()))) {
			return;
		}

		const failed = downloads.failures.some((e) => e.id === episode.id);

		await invoke('download', { episode });

		if (failed) {
			openView('queue');
		}
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

	/** Saves an interval, and puts the stored one back if saving fails. */
	async function saveInterval(key: 'updateInterval' | 'appUpdateInterval', hours: number) {
		const stored = settings[key];

		errorMessage = '';
		settings[key] = hours;

		try {
			await invoke('set_settings', { patch: { [key]: hours } });
		} catch (e) {
			settings[key] = stored;
			throw e;
		}
	}

	let view = $state<'dashboard' | 'player' | 'schedule' | 'shows' | 'queue' | 'settings'>('dashboard');
	let openedShow = $state<Show | null>(null);

	/** Of `openedShow`, from its show record until its fetch returns. */
	let showDetails = $state<ShowDetails | null>(null);
	let refreshing = $state<string[]>([]);

	/** Shows the cached episodes and details at once, then merges the show's fetched ones in. */
	async function openShow(show: Show) {
		errorMessage = '';

		// Reopening the open show, as a notification click can, keeps its details on screen while they refresh
		const reopening = openedShow?.slug === show.slug;

		openedShow = show;

		if (!reopening) {
			showDetails = null;

			// A record that can't be read is only a slower first paint, never a reason to skip the refresh
			const record = await invoke<ShowDetails | null>('get_show_record', { slug: show.slug }).catch(() => null);

			// A refresh that returned meanwhile is newer than the record
			if (openedShow?.slug === show.slug) {
				showDetails ??= record;
			}
		}

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

		// Read before the dialog, so what the user confirmed is what happens
		const unsubscribing = subscribed.includes(show.slug);

		if (
			unsubscribing &&
			!(await confirmDialog?.confirm({
				title: 'Unsubscribe',
				message: `Unsubscribe from ${show.title}?`,
				action: 'Unsubscribe',
			}))
		) {
			return;
		}

		subscribing.push(show.slug);

		try {
			settings = unsubscribing
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

		// Show views and schedule fetches record newer dates
		if (value === 'shows') {
			invoke<Record<string, string>>('get_last_aired')
				.then((loaded) => {
					lastAired = loaded;
				})
				.catch(showError);
		}
	}

	/** Keeps the old size showing if clearing fails. */
	async function clearImageCache() {
		errorMessage = '';

		if (!(await confirmDialog?.confirm({ title: 'Clear Image Cache', message: 'Clear the cached show images?', action: 'Clear' }))) {
			return;
		}

		await invoke('clear_image_cache');
		imageCacheSize = 0;
	}

	const jsonFilters = [{ name: 'JSON', extensions: ['json'] }];
	let importing = $state(false);

	/** Subscribes to the shows in a file chosen by the user, keeping the existing subscriptions. */
	async function importSubscriptions() {
		errorMessage = '';

		const path = await open({ title: 'Import subscriptions', filters: jsonFilters });

		if (!path) {
			return;
		}

		importing = true;

		try {
			settings = await invoke<Settings>('import_subscriptions', { path });
		} finally {
			importing = false;
		}
	}

	async function exportSubscriptions() {
		errorMessage = '';

		const path = await save({ title: 'Export subscriptions', defaultPath: 'rinse-m8-subscriptions.json', filters: jsonFilters });

		if (path) {
			await invoke('export_subscriptions', { path });
		}
	}

	let lastfm = $state<{ user: string | null } | null>(null);
	let connectingLastfm = $state(false);

	/** Resolves once the user approves on Last.fm or cancels, or fails when approval times out. */
	async function connectLastfm() {
		errorMessage = '';
		connectingLastfm = true;

		try {
			const user = await invoke<string | null>('connect_lastfm');

			if (user) {
				lastfm = { user };
			}
		} finally {
			connectingLastfm = false;
		}
	}

	async function disconnectLastfm() {
		errorMessage = '';

		if (
			!(await confirmDialog?.confirm({
				title: 'Disconnect Last.fm',
				message: `Disconnect ${lastfm?.user} from Last.fm?`,
				action: 'Disconnect',
			}))
		) {
			return;
		}

		await invoke('disconnect_lastfm');
		lastfm = { user: null };
	}

	/** Dismissing it hides that version until the next launch. */
	let update = $state<{ version: string; percent: number | null } | null>(null);

	// `mise run dev:update` fakes an update for design review; release builds drop this, since DEV is false there
	const fakeUpdate = import.meta.env.DEV && Boolean(import.meta.env.VITE_FAKE_UPDATE);

	let foundUpdate: Update | null = null;
	let dismissedVersion: string | null = null;
	const millisecondsPerHour = 3_600_000;

	function checkForUpdate() {
		// A running download keeps the update it started with
		if (update && update.percent !== null) {
			return;
		}

		check()
			.then((found) => {
				foundUpdate = found;

				if (found && found.version !== dismissedVersion) {
					update = { version: found.version, percent: null };
				}
			})
			.catch(() => {
				// Being offline is normal, so a failed check stays silent
			});
	}

	/** Set while the settings' Check now button waits out its cooldown. */
	let checkedUpdateManually = $state(false);
	const manualCheckCooldown = 60_000;

	function checkForUpdateNow() {
		checkedUpdateManually = true;
		checkForUpdate();
		setTimeout(() => {
			checkedUpdateManually = false;
		}, manualCheckCooldown);
	}

	if (fakeUpdate) {
		update = { version: '9.9.9', percent: null };
	} else {
		checkForUpdate();
	}

	// The launch check above runs regardless, so 0 only skips the repeats
	$effect(() => {
		if (fakeUpdate || !settings.appUpdateInterval) {
			return;
		}

		const timer = setInterval(checkForUpdate, settings.appUpdateInterval * millisecondsPerHour);

		return () => clearInterval(timer);
	});

	/** The fake download stops at 100% rather than relaunching. */
	function fakeDownload(version: string) {
		const progress = { version, percent: 0 };

		update = progress;

		const timer = setInterval(() => {
			progress.percent += 5;
			update = { ...progress };

			if (progress.percent === 100) {
				clearInterval(timer);
			}
		}, 100);
	}

	/** A failed download or install brings the buttons back, so the user can retry or dismiss. */
	async function startUpdate() {
		if (!update) {
			return;
		}

		const { version } = update;

		if (fakeUpdate) {
			fakeDownload(version);

			return;
		}

		if (!foundUpdate) {
			return;
		}

		let total = 0;
		let received = 0;

		errorMessage = '';
		update = { version, percent: 0 };

		try {
			await foundUpdate.downloadAndInstall((event) => {
				if (event.event === 'Started') {
					total = event.data.contentLength ?? 0;
				} else if (event.event === 'Progress' && total) {
					received += event.data.chunkLength;
					update = { version, percent: Math.floor((received / total) * 100) };
				}
			});

			await relaunch();
		} catch (e) {
			showError(e);
			update = { version, percent: null };
		}
	}

	function showError(e: unknown) {
		errorMessage = String(e);
	}

	const offlineMessage = 'You are offline';

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

	// The tray menu's play/pause item and its Settings item, which has already shown the window
	listen('toggle-playback', () => (playing ? player?.pause() : player?.controls.onplay()));
	listen('open-settings', () => openView('settings'));

	$effect(() => {
		invoke('set_tray_playing', { playing: playing !== null }).catch(showError);
	});

	// The background refresh sends the whole directory once it has every page
	listen<DirectoryShow[]>('show-directory', (event) => {
		directory = event.payload;
	});
</script>

<!-- With Tauri's file drop off, a dropped file would otherwise open in the window -->
<!-- Going back online clears only the offline banner, not an error shown since -->
<svelte:window
	ondragover={(event) => event.dataTransfer?.types.includes('Files') && event.preventDefault()}
	ondrop={(event) => event.dataTransfer?.types.includes('Files') && event.preventDefault()}
	onoffline={() => showError(offlineMessage)}
	ononline={() => {
		if (errorMessage === offlineMessage) {
			errorMessage = '';
		}
	}}
/>

{#if update}
	<UpdateBanner
		version={update.version}
		percent={update.percent}
		onupdate={startUpdate}
		ondismiss={() => {
			dismissedVersion = update?.version ?? null;
			update = null;
		}}
	/>
{/if}

<nav>
	{#each [['dashboard', 'My Shows'], ['player', 'Player'], ['schedule', 'Schedule'], ['shows', 'Shows'], ['queue', 'Downloads'], ['settings', 'Settings']] as const as [value, label] (value)}
		<button type="button" aria-current={!openedShow && view === value ? 'page' : undefined} onclick={() => openView(value)}
			>{label}</button
		>
	{/each}
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
				onenqueue={(episode) => player?.enqueue(episode).catch(showError)}
				ondownload={(episode) => download(episode).catch(showError)}
				onopenshow={(episode) => openShow(showOf(episode)).catch(showError)}
				ontogglesubscription={(show) => toggleSubscription(show).catch(showError)}
				onback={() => {
					openedShow = null;
				}}
			/>
		{/key}
	{:else if view === 'player'}
		{#if player}
			<PlayerView
				controls={player.controls}
				{queue}
				onplay={(index) => player?.playFromQueue(index).catch(showError)}
				onremove={(index) => player?.dequeue(index)}
				onmove={(from, to) => player?.move(from, to)}
				onclear={async () => {
					if (await confirmDialog?.confirm({ title: 'Clear Queue', message: 'Clear the play queue?', action: 'Clear' })) {
						player?.clearQueue();
					}
				}}
			/>
		{/if}
	{:else if view === 'queue'}
		<QueueView
			{downloads}
			onremove={(id) => invoke('remove_download', { id }).catch(showError)}
			onmove={(id, index) => invoke('move_download', { id, index }).catch(showError)}
			oncancel={() => invoke('cancel_download').catch(showError)}
			onretry={(id) => invoke('retry_download', { id }).catch(showError)}
			onretryall={() => invoke('retry_all_downloads').catch(showError)}
			onunmark={(id) => invoke('unmark_downloaded', { id }).catch(showError)}
			onclear={async () => {
				if (
					await confirmDialog?.confirm({
						title: 'Clear Downloads',
						message: 'Clear the list of previous downloads?',
						action: 'Clear',
					})
				) {
					invoke('clear_downloaded').catch(showError);
				}
			}}
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
			onupdateintervalchange={(hours) => saveInterval('updateInterval', hours).catch(showError)}
			appUpdateInterval={settings.appUpdateInterval}
			onappupdateintervalchange={(hours) => saveInterval('appUpdateInterval', hours).catch(showError)}
			canCheckAppUpdate={!checkedUpdateManually}
			oncheckappupdate={checkForUpdateNow}
			{imageCacheSize}
			onclearimagecache={() => clearImageCache().catch(showError)}
			{importing}
			canExport={subscribed.length > 0}
			onimport={() => importSubscriptions().catch(showError)}
			onexport={() => exportSubscriptions().catch(showError)}
			{lastfm}
			{connectingLastfm}
			onconnectlastfm={() => connectLastfm().catch(showError)}
			oncancellastfm={() => invoke('cancel_lastfm_connect').catch(showError)}
			ondisconnectlastfm={() => disconnectLastfm().catch(showError)}
		/>
	{:else if view === 'shows'}
		<EpisodeFilters bind:shownStations bind:search>
			<label>
				hide shows
				<select bind:value={hideOlderThan}>
					<option value={null}>none</option>
					<option value={6}>older than 6 months</option>
					<option value={12}>older than 1 year</option>
					<option value={24}>older than 2 years</option>
					<option value={48}>older than 4 years</option>
				</select>
			</label>
		</EpisodeFilters>

		<ShowDirectory
			shows={filteredDirectory}
			{lastAired}
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
							onenqueue={(episode) => player?.enqueue(episode).catch(showError)}
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
						onenqueue={(episode) => player?.enqueue(episode).catch(showError)}
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
				onenqueue={(episode) => player?.enqueue(episode).catch(showError)}
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
		onviewqueue={() => openView('queue')}
	/>
	<Player bind:this={player} bind:playing bind:queue {episodes} onerror={showError} />
</div>

<ConfirmDialog bind:this={confirmDialog} />

<style>
	/* Pinned to the top of the window while the page scrolls under it */
	nav {
		position: sticky;
		top: 0;
		z-index: 1;
		box-sizing: border-box;
		display: flex;
		/* As tall as the player bar, bottom line included */
		height: 40px;
		border-bottom: 1px solid currentColor;
		background: var(--paper);
	}

	/* Full-height cells */
	nav button {
		border: none;
		padding: 0 1rem;
		white-space: nowrap;
	}

	/* One line before each tab but the first. Ink, not currentColor, so it doesn't vanish beside the active tab. */
	nav button + button {
		border-left: 1px solid var(--ink);
	}

	/* Settings sits at the right edge */
	nav button:last-child {
		margin-left: auto;
	}

	/* Inset, since the cells touch each other and the window's top edge */
	nav button:focus-visible {
		outline-offset: -3px;
	}

	main {
		padding: 1rem;
	}

	/* Fills the window below the nav, so the swapped background doesn't stop short */
	main.inverted {
		display: flex;
		flex-direction: column;
		flex: 1;
	}

	.bars {
		position: sticky;
		bottom: 0;
		margin-top: auto;
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
		/* Cancels main's padding, so the banner meets the window edges and the nav */
		margin: -1rem -1rem 1rem;
		padding: 0.5rem 1rem;
		background: var(--accent);
		color: white;
	}
</style>
