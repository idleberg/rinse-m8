/** Orders versions by number, so 0.10.0 comes after 0.9.0. */
export const byVersion = (a: string, b: string) => a.localeCompare(b, 'en', { numeric: true });

/** The newest version with notes that is newer than the seen one and no newer than the current one. A fresh install,
 * with no seen version, gets none; an unknown seen version, the empty string, counts as older than every version. */
export function pickNotes(seen: string | null, current: string, versions: string[]) {
	if (seen === null) {
		return;
	}

	return versions
		.filter((version) => byVersion(version, seen) > 0 && byVersion(version, current) <= 0)
		.sort(byVersion)
		.at(-1);
}

/** The version whose notes were last seen. Versions before 0.23.0 recorded none, but every version saved the filters,
 * so with those an empty string marks an update from an unknown version rather than a fresh install. */
export function seenVersion(storage: Pick<Storage, 'getItem'>) {
	return storage.getItem('seenVersion') ?? (storage.getItem('filters') === null ? null : '');
}
