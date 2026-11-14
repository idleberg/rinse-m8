<script lang="ts">
	import EpisodeFilters from '#lib/components/EpisodeFilters.svelte';
	import EpisodeTable from '#lib/components/EpisodeTable.svelte';
	import ShowSection from '#lib/components/ShowSection.svelte';
	import { orderSections } from '#lib/episodes';
	import { episodes } from '#lib/episodes.svelte';
	import { filters } from '#lib/filters.svelte';
	import { player } from '#lib/player.svelte';
	import { settings } from '#lib/settings.svelte';

	let showSeen = $state(false);

	const filteredEpisodes = $derived(episodes.list.filter(filters.matchesEpisode));

	const showSections = $derived(
		orderSections(
			settings.stored.subscriptions.map((show) => ({
				show,
				episodes: filteredEpisodes.filter(
					(episode) =>
						episode.showSlug === show.slug && (showSeen || !player.isSeen(episode)),
				),
			})),
			settings.stored.showOrder,
		),
	);

	/** The newest filtered episode of each subscribed show, newest first. */
	const latestEpisodes = $derived.by(() => {
		const seen = new Set<string>();

		// The latest is picked before the seen check, so an older episode doesn't stand in for it
		return filteredEpisodes.filter((episode) => {
			if (!settings.subscribed.includes(episode.showSlug) || seen.has(episode.showSlug)) {
				return false;
			}

			seen.add(episode.showSlug);

			return showSeen || !player.isSeen(episode);
		});
	});
</script>

<EpisodeFilters shared bind:mp3Only={filters.mp3Only} bind:hideRebroadcasts={filters.hideRebroadcasts}>
	<label>
		<input type="checkbox" bind:checked={showSeen} />
		show seen
	</label>
</EpisodeFilters>

{#if settings.stored.subscriptions.length}
	<section class="latest">
		<h2>Latest</h2>
		{#if latestEpisodes.length}
			<EpisodeTable episodes={latestEpisodes} markable subscribable />
		{:else if episodes.loading}
			<p role="status">Loading episodes…</p>
		{:else}
			<p>No episodes match the filters</p>
		{/if}
	</section>
{/if}

<!-- The else only covers having no subscriptions, a show whose episodes are all filtered out is hidden -->
{#each showSections as section (section.show.slug)}
	{#if section.episodes.length}
		<ShowSection show={section.show} episodes={section.episodes} />
	{/if}
{:else}
	<p>
		Subscribe to a show from the <a href="/schedule">schedule</a> or pick one from the <a href="/shows">shows</a> to see
		its episodes here
	</p>
{/each}

<style>
	/* Matches the show sections below it */
	.latest {
		margin: 0 0 2rem;
	}

	.latest h2 {
		margin: 0 0 0.5rem;
		font-size: 1.25rem;
		text-transform: uppercase;
	}

	.latest p {
		text-transform: uppercase;
		color: var(--muted);
	}
</style>
