/// <reference types="bun" />

import { expect, test as it } from 'bun:test';
import { placeFlyout } from './flyout';

const viewport = { width: 1000, height: 800 };

it('opens below a trigger in the top half, right-aligned to it', () => {
	expect(placeFlyout({ top: 100, bottom: 120, right: 980 }, viewport)).toEqual({
		top: '120px',
		right: '20px',
	});
});

it('opens above a trigger in the bottom half, so the window edge cannot clip it', () => {
	expect(placeFlyout({ top: 700, bottom: 720, right: 980 }, viewport)).toEqual({
		bottom: '100px',
		right: '20px',
	});
});
