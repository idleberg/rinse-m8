<script lang="ts">
	import { settings } from '#lib/settings.svelte';

	let {
		src,
		empty,
		onerror,
		height = $bindable(0),
	}: {
		/** The original `image` scheme URL, unstyled. */
		src: string | null | undefined;
		/** Shown on the black square when there's no `src`. */
		empty?: string;
		onerror?: () => void;
		height?: number;
	} = $props();

	const styled = $derived(src && settings.styled(src));

	/** What the square says until the image shows. The original is loaded first, so a styled copy, made from it,
	 * gets a status of its own. */
	let status = $state<string | null>(null);

	const load = (url: string) => {
		const image = new Image();

		image.src = url;

		return image.decode();
	};

	$effect(() => {
		if (!(src && styled)) {
			return;
		}

		let cancelled = false;

		status = 'Loading image…';

		(async () => {
			await load(src);

			if (styled !== src && !cancelled) {
				status = 'Transforming image…';
				await load(styled);
			}
		})().then(
			() => {
				if (!cancelled) {
					status = null;
				}
			},
			() => {
				if (!cancelled) {
					onerror?.();
				}
			},
		);

		return () => {
			cancelled = true;
		};
	});
</script>

<div class="artwork" bind:clientHeight={height}>
	{#if src && !status}
		<img src={styled} alt="" />
	{:else if src}
		<p role="status">{status}</p>
	{:else if empty}
		<p>{empty}</p>
	{/if}
</div>

<style>
	/* A black square, with the image cropped to fit over it */
	.artwork {
		position: relative;
		display: grid;
		place-items: center;
		flex: none;
		width: min(20rem, 50%);
		aspect-ratio: 1;
		background: black;
		color: white;
		text-transform: uppercase;
		text-align: center;
	}

	/* Laid over the square, so its size can't stretch the grid */
	img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	p {
		margin: 0;
		padding: 1rem;
	}
</style>
