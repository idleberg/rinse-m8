/** Rows a table mounts with; the rest follow once it has painted, so a long table doesn't hold up opening its page. */
export const firstRows = 50;

/** Call while a component initialises. Returns a function that cuts a table's rows to `firstRows` until the component
 * has painted, and passes them through after. */
export function deferRows() {
	let deferred = $state(true);

	// A frame callback runs before the paint, so the timeout pushes the rest past it
	$effect(() => {
		let timeout: ReturnType<typeof setTimeout>;
		const frame = requestAnimationFrame(() => {
			timeout = setTimeout(() => {
				deferred = false;
			});
		});

		return () => {
			cancelAnimationFrame(frame);
			clearTimeout(timeout);
		};
	});

	return <T>(rows: T[]) => (deferred ? rows.slice(0, firstRows) : rows);
}
