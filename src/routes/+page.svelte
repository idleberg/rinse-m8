<script lang="ts">
	import { invoke } from '@tauri-apps/api/core';
	import { listen } from '@tauri-apps/api/event';
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
	import { confirm } from '#lib/confirm.svelte';
	import { downloads } from '#lib/downloads.svelte';
	import { available, type DirectoryShow, dead, type Episode, monthsAgo, type Show, type ShowDetails, type ShowPage, showOf, stations } from '#lib/episodes';
	import { errors } from '#lib/errors.svelte';
	import { lastfm } from '#lib/lastfm.svelte';
	import { settings } from '#lib/settings.svelte';
	import { updates } from '#lib/updates.svelte';

	let episodes = $state<Episode[]>([]);
	/** True until the first episode fetch settles, so an empty list isn't mistaken for filtered out. */
	let loadingEpisodes = $state(true);

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
		settings.stored.subscriptions.map((show) => ({
			show,
			episodes: filteredEpisodes.filter(
				(episode) =>
					episode.showSlug === show.slug && (showDownloaded || !downloads.queue.downloaded.includes(episode.id)),
			),
		})),
	);

	/** The newest filtered episode of each subscribed show, newest first. */
	const latestEpisodes = $derived.by(() => {
		const seen = new Set<string>();

		// The latest is picked before the downloaded check, so an older episode doesn't stand in for it
		return filteredEpisodes.filter((episode) => {
			if (!settings.subscribed.includes(episode.showSlug) || seen.has(episode.showSlug)) {
				return false;
			}

			seen.add(episode.showSlug);

			return showDownloaded || !downloads.queue.downloaded.includes(episode.id);
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
	let playing = $state<string | null>(null);
	let queue = $state<Episode[]>([]);

	/** Dead episodes are dropped here, so no table shows them, whatever the filters. */
	function setEpisodes(list: Episode[]) {
		episodes = list.filter((episode) => !dead(episode)).sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
	}

	let view = $state<'dashboard' | 'player' | 'schedule' | 'shows' | 'queue' | 'settings'>('dashboard');
	let openedShow = $state<Show | null>(null);

	/** Of `openedShow`, from its show record until its fetch returns. */
	let showDetails = $state<ShowDetails | null>(null);
	let refreshing = $state<string[]>([]);

	/** Shows the cached episodes and details at once, then merges the show's fetched ones in. */
	async function openShow(show: Show) {
		errors.clear();

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

	function openView(value: typeof view) {
		view = value;
		openedShow = null;

		// Show views and schedule fetches record newer dates
		if (value === 'shows') {
			invoke<Record<string, string>>('get_last_aired')
				.then((loaded) => {
					lastAired = loaded;
				})
				.catch(errors.report);
		}
	}

	async function clearQueue() {
		if (await confirm({ title: 'Clear Queue', message: 'Clear the play queue?', action: 'Clear' })) {
			player?.clearQueue();
		}
	}

	errors.init();
	settings.init();
	lastfm.init();
	updates.init();

	invoke<Episode[]>('get_episodes')
		.then(setEpisodes)
		.catch(errors.report)
		.finally(() => {
			loadingEpisodes = false;
		});

	// The poller sends the whole cache after each update
	listen<Episode[]>('episodes-updated', (event) => setEpisodes(event.payload));

	downloads.init({
		openQueue: () => openView('queue'),
	});

	invoke<DirectoryShow[] | null>('get_show_directory')
		.then((loaded) => {
			directory ??= loaded;
		})
		.catch(errors.report);

	// A click on a new-episode notification opens its show, refetched so the new episode is listed
	listen<Show>('open-show', (event) => openShow(event.payload).catch(errors.report));

	// The tray menu's play/pause item and its Settings item, which has already shown the window
	listen('toggle-playback', () => (playing ? player?.pause() : player?.controls.onplay()));
	listen('open-settings', () => openView('settings'));

	$effect(() => {
		invoke('set_tray_playing', { playing: playing !== null }).catch(errors.report);
	});

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

<UpdateBanner />

<nav>
	{#each [['dashboard', 'My Shows'], ['player', 'Player'], ['schedule', 'Schedule'], ['shows', 'Shows'], ['queue', 'Downloads'], ['settings', 'Settings']] as const as [value, label] (value)}
		<button type="button" aria-current={!openedShow && view === value ? 'page' : undefined} onclick={() => openView(value)}
			>{label}</button
		>
	{/each}
</nav>

<!-- Settings swap light and dark, to stand apart from the other pages -->
<main class:inverted={view === 'settings' && !openedShow}>
	{#if errors.message}
		<p role="alert">
			{errors.message}
			<button type="button" class="icon" aria-label="Dismiss" title="Dismiss" onclick={errors.clear}>
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
				{playing}
				onplay={(episode) => player?.play(episode).catch(errors.report)}
				onpause={() => player?.pause()}
				onenqueue={(episode) => player?.enqueue(episode).catch(errors.report)}
				onopenshow={(episode) => openShow(showOf(episode)).catch(errors.report)}
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
				onplay={(index) => player?.playFromQueue(index).catch(errors.report)}
				onremove={(index) => player?.dequeue(index)}
				onmove={(from, to) => player?.move(from, to)}
				onclear={() => clearQueue().catch(errors.report)}
			/>
		{/if}
	{:else if view === 'queue'}
		<QueueView />
	{:else if view === 'settings'}
		<SettingsView />
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
			onopenshow={(show) => openShow(show).catch(errors.report)}
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
			{#if settings.stored.subscriptions.length}
				<section class="latest">
					<h2>Latest</h2>
					{#if latestEpisodes.length}
						<EpisodeTable
							episodes={latestEpisodes}
							{playing}
							onplay={(episode) => player?.play(episode).catch(errors.report)}
							onpause={() => player?.pause()}
							onenqueue={(episode) => player?.enqueue(episode).catch(errors.report)}
							markable
							onopenshow={(episode) => openShow(showOf(episode)).catch(errors.report)}
							subscribable
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
						{playing}
						onplay={(episode) => player?.play(episode).catch(errors.report)}
						onpause={() => player?.pause()}
						onenqueue={(episode) => player?.enqueue(episode).catch(errors.report)}
						onopenshow={(show) => openShow(show).catch(errors.report)}
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
				{playing}
				onplay={(episode) => player?.play(episode).catch(errors.report)}
				onpause={() => player?.pause()}
				onenqueue={(episode) => player?.enqueue(episode).catch(errors.report)}
				onopenshow={(episode) => openShow(showOf(episode)).catch(errors.report)}
				subscribable
			/>
		{:else if loadingEpisodes}
			<p class="empty" role="status">Loading episodes…</p>
		{:else}
			<p class="empty">No episodes match the filters</p>
		{/if}
	{/if}
</main>

<div class="bars">
	<DownloadStatus onviewqueue={() => openView('queue')} />
	<Player bind:this={player} bind:playing bind:queue {episodes} />
</div>

<ConfirmDialog />

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
