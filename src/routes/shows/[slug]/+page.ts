import { invoke } from '@tauri-apps/api/core';
import type { ShowDetails } from '#lib/episodes';
import type { PageLoad } from './$types';

/** The show record, so the view opens with the cached details while the page refreshes them. */
export const load: PageLoad = async ({ params }) => {
	// A record that can't be read is only a slower first paint, never a reason to skip the refresh
	const record = await invoke<ShowDetails | null>('get_show_record', { slug: params.slug }).catch(
		() => null,
	);

	return { slug: params.slug, record };
};
