/** Whether to show the release notes: only after an update, never on a fresh install, and only when there are notes. */
export function shouldShow(seen: string | null, current: string, notes: string) {
	return seen !== null && seen !== current && hasNotes(notes);
}

/** Whether the rendered notes have any content, beyond whitespace. */
export function hasNotes(notes: string) {
	return notes.trim() !== '';
}
