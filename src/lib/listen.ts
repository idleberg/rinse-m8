/** The longest step between two `timeupdate` events that still counts as playing on, in seconds. Browsers fire one every 250 ms at most. */
const maxStep = 1;

/** Seconds heard as the playhead moved from `previous` to `current`. A seek either way jumps further, so it counts as nothing. */
export function heardBetween(previous: number, current: number) {
	const step = current - previous;

	return step > 0 && step <= maxStep ? step : 0;
}

/** Last.fm's rule: a track counts once half of it, or 4 minutes of it, has been heard. */
const scrobbleLimit = 240;

/** Seconds an episode `duration` long has to be heard before it's scrobbled. Before its metadata loads, the duration is `NaN`. */
export function scrobbleAfter(duration: number) {
	return Number.isFinite(duration) ? Math.min(duration / 2, scrobbleLimit) : scrobbleLimit;
}
