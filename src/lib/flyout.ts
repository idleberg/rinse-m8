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
