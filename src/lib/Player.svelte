<script lang="ts">
	import { load } from '@tauri-apps/plugin-store';
	import { tick } from 'svelte';
	import { type Episode, episodeLabel } from './episodes';

	let {
		episodes,
		onerror,
	}: {
		/** The episode cache, where the last-played episode is looked up at launch. */
		episodes: Episode[];
		onerror: (e: unknown) => void;
	} = $props();

	/** Seconds, by episode id. */
	let positions: Record<string, number> = {};
	let lastPlayed = $state<string | null>(null);
	let episode = $state<Episode | null>(null);
	let audio = $state<HTMLAudioElement>();
	let savedAt = 0;

	const ready = load('player.json').then(async (store) => {
		positions = (await store.get<Record<string, number>>('positions')) ?? {};
		lastPlayed = (await store.get<string>('lastPlayed')) ?? null;

		return store;
	});

	ready.catch((e) => onerror(e));

	// At launch the last-played episode comes back paused, once the cache has loaded
	$effect(() => {
		if (!episode && lastPlayed) {
			episode = episodes.find((e) => e.id === lastPlayed) ?? null;
		}
	});

	/** Loads the episode where it was left off and starts playing it. */
	export async function play(next: Episode) {
		const store = await ready;

		savePosition(false);
		episode = next;
		await store.set('lastPlayed', next.id);
		await tick();

		// Switching episodes while one is still loading aborts its play()
		try {
			await audio?.play();
		} catch (e) {
			if (!(e instanceof DOMException && e.name === 'AbortError')) {
				throw e;
			}
		}
	}

	function persistPositions() {
		ready.then((store) => store.set('positions', positions)).catch((e) => onerror(e));
	}

	function restorePosition() {
		if (audio && episode) {
			audio.currentTime = positions[episode.id] ?? 0;
		}
	}

	/** Skipped while a new source loads, since the position then reads 0, and after the end, which `forgetPosition` handles. */
	function savePosition(throttle: boolean) {
		if (!audio || !episode || audio.readyState === 0 || audio.ended || (throttle && Date.now() - savedAt < 5000)) {
			return;
		}

		savedAt = Date.now();
		positions[episode.id] = audio.currentTime;
		persistPositions();
	}

	/** A finished episode starts over next time. */
	function forgetPosition() {
		if (episode) {
			delete positions[episode.id];
			persistPositions();
		}
	}
</script>

{#if episode?.mp3}
	<footer>
		<span>{episodeLabel(episode)}</span>
		<audio
			bind:this={audio}
			src={episode.mp3}
			controls
			preload="metadata"
			onloadedmetadata={restorePosition}
			ontimeupdate={() => savePosition(true)}
			onseeked={() => savePosition(false)}
			onpause={() => savePosition(false)}
			onended={forgetPosition}
		></audio>
	</footer>
{/if}

<style>
	footer {
		display: flex;
		gap: 1rem;
		align-items: center;
		border-top: 1px solid currentColor;
		padding: 0.5rem 1rem;
		background: var(--paper);
		text-transform: uppercase;
	}

	span {
		white-space: nowrap;
	}

	audio {
		flex: 1;
	}
</style>
