import { tick } from 'svelte';

/** Where a flyout goes, as fixed-position insets: right-aligned to its trigger, and below it unless the trigger is in the
 * window's bottom half, where it opens above. Needs no measuring, so it can be set before the flyout shows. */
export function placeFlyout(
	trigger: { top: number; bottom: number; right: number },
	viewport: { width: number; height: number },
): { top?: string; bottom?: string; right: string } {
	const right = `${viewport.width - trigger.right}px`;

	if (trigger.bottom > viewport.height / 2) {
		return { bottom: `${viewport.height - trigger.top}px`, right };
	}

	return { top: `${trigger.bottom}px`, right };
}

/** After a button drops its row, focus would fall to the page, so it moves to the flyout trigger (or the `selector`
 * match) of the row now at `index`, or of the last row. Waits for the DOM to update. */
export async function refocusTrigger(
	body: HTMLTableSectionElement | undefined,
	index: number,
	selector = '[aria-haspopup]',
) {
	await tick();

	if (body && document.activeElement === document.body) {
		const { rows } = body;

		rows[Math.min(index, rows.length - 1)]?.querySelector<HTMLElement>(selector)?.focus();
	}
}
