import { goto } from '$app/navigation';

/** Opens the show's view. Its load runs again even when the show is already open, so a new episode is listed. */
export function openShow(slug: string) {
	return goto(`/shows/${encodeURIComponent(slug)}`, { invalidateAll: true });
}
