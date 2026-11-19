/** Whether to show the release notes: only after an update, never on a fresh install, and only when there are notes. */
export function shouldShow(seen: string | null, current: string, notes: string) {
	return seen !== null && seen !== current && hasNotes(notes);
}

/** Whether the rendered notes have any content, beyond whitespace. */
export function hasNotes(notes: string) {
	return notes.trim() !== '';
}

/** The version whose notes were last seen. Versions before 0.23.0 recorded none, but every version saved the filters,
 * so with those an empty string marks an update from an unknown version rather than a fresh install. */
export function seenVersion(storage: Pick<Storage, 'getItem'>) {
	return storage.getItem('seenVersion') ?? (storage.getItem('filters') === null ? null : '');
}
