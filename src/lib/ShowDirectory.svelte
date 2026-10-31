<script lang="ts">
	import type { DirectoryShow, Show } from './episodes';
	import SubscribeButton from './SubscribeButton.svelte';

	let {
		shows,
		subscribed,
		subscribing,
		onopenshow,
		ontogglesubscription,
	}: {
		/** The filtered directory, or null until the first refresh finishes. */
		shows: DirectoryShow[] | null;
		/** Show slugs. */
		subscribed: string[];
		/** Show slugs. */
		subscribing: string[];
		onopenshow: (show: Show) => void;
		ontogglesubscription: (show: Show) => void;
	} = $props();
</script>

{#if shows === null}
	<p role="status">Loading the show directory…</p>
{:else}
	<table>
		<thead>
			<tr>
				<th>Show</th>
				<th>Station</th>
				<th>Genres</th>
				<th></th>
			</tr>
		</thead>
		<tbody>
			{#each shows as show (show.slug)}
				<tr>
					<td><button type="button" class="link" onclick={() => onopenshow(show)}>{show.title}</button></td>
					<td>{show.station}</td>
					<td>{show.genres.join(', ')}</td>
					<td class="actions">
						<SubscribeButton
							subscribed={subscribed.includes(show.slug)}
							disabled={subscribing.includes(show.slug)}
							onclick={() => ontogglesubscription(show)}
						/>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}

<style>
	table {
		width: 100%;
		border-collapse: collapse;
		text-transform: uppercase;
	}

	th,
	td {
		padding: 0.25rem 1ch;
		text-align: left;
	}

	th {
		border-bottom: 1px solid currentColor;
		font-weight: 700;
	}

	/* A row of `-` characters, as in the episode tables */
	td {
		background: linear-gradient(to right, var(--muted) 60%, transparent 0) left bottom / 1ch 1px repeat-x;
	}

	.link {
		border: none;
		padding: 0;
		text-align: left;
		text-decoration: underline;
	}

	.actions {
		text-align: right;
	}

	p {
		text-transform: uppercase;
		color: var(--muted);
	}
</style>
