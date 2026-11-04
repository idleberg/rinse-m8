<script lang="ts">
	import { invoke } from '@tauri-apps/api/core';
	import ShowView from '#lib/components/ShowView.svelte';
	import { directory } from '#lib/directory.svelte';
	import type { ShowPage } from '#lib/episodes';
	import { episodes } from '#lib/episodes.svelte';
	import { errors } from '#lib/errors.svelte';
	import { settings } from '#lib/settings.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	/** A reload only has the slug, so the title comes from wherever the show is known, the slug standing in until then. */
	const show = $derived({
		slug: data.slug,
		title:
			settings.stored.subscriptions.find((s) => s.slug === data.slug)?.title ??
			directory.shows?.find((s) => s.slug === data.slug)?.title ??
			episodes.list.find((e) => e.showSlug === data.slug)?.showTitle ??
			data.slug,
	});

	/** The show record until the refresh returns. */
	let details = $derived(data.record);
	let refreshing = $state(true);

	// Every load refreshes the show, also when it's already open. The cleanup drops a reply for a show since left.
	$effect(() => {
		const { slug } = data;
		let current = true;

		errors.clear();
		refreshing = true;

		// ponytail: the reply replaces the whole list, so a poller update landing mid-fetch is undone until the next one
		invoke<ShowPage>('refresh_show', { slug })
			.then((page) => {
				episodes.replace(page.episodes);

				if (current) {
					details = page.details;
				}
			})
			.catch(errors.report)
			.finally(() => {
				if (current) {
					refreshing = false;
				}
			});

		return () => {
			current = false;
		};
	});
</script>

<!-- Keyed, as the page stays mounted from one show to the next, so another show starts with fresh filters -->
{#key data.slug}
	<ShowView {show} {details} {refreshing} />
{/key}
