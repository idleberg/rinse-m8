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

/** An episode counts as played once a tenth of it, or 15 minutes of it, has been heard. */
const playShare = 0.1;
const playLimit = 900;

/** Seconds an episode `duration` long has to be heard before it counts as a play. Before its metadata loads, the
 * duration is `NaN`. */
export function countPlayAfter(duration: number) {
	return Number.isFinite(duration) ? Math.min(duration * playShare, playLimit) : playLimit;
}

export const millisecondsPerSecond = 1000;

/** Where `h:mm:ss` sits in an ISO timestamp, past the hours' leading digit. */
const isoTimeStart = 12;
const isoTimeEnd = 19;

/** As `h:mm:ss`, which fits mixes up to ten hours. */
export function formatTime(seconds: number) {
	return new Date(seconds * millisecondsPerSecond).toISOString().slice(isoTimeStart, isoTimeEnd);
}

/** The repeat button's states, in the order clicking it cycles through them. */
export const repeatModes = ['off', 'all', 'one'] as const;

export type Repeat = (typeof repeatModes)[number];

/** The volume stored as `stored`, between 0 and 1. A missing or invalid one is full volume. */
export function parseVolume(stored: string | null) {
	const volume = Number.parseFloat(stored ?? '');

	return volume >= 0 && volume <= 1 ? volume : 1;
}

/** The volume button's icon shows the level as this many bars. */
const iconBars = 3;

/** How many of the volume icon's bars fill at `volume`: one per share begun, so any sound fills the first. */
export function volumeBars(volume: number) {
	return Math.ceil(volume * iconBars);
}

/** The pixel delta of one mouse-wheel notch. */
export const wheelNotch = 100;

/** How far one mouse-wheel notch changes the volume. */
const wheelStep = 0.05;

/** `volume` after a wheel event of `deltaY`: scrolling up turns it up. Scaled by the delta, so a trackpad's many small events don't race. */
export function wheelVolume(volume: number, deltaY: number) {
	return Math.min(1, Math.max(0, volume - (deltaY / wheelNotch) * wheelStep));
}
