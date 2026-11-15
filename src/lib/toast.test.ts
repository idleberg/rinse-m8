/// <reference types="bun" />

import { expect, test as it } from 'bun:test';
import { toast } from './toast.svelte';

const undo = { label: 'Undo', run: () => undefined };

it('runs the action once and hides the toast', () => {
	let runs = 0;

	toast.show('Gone', null, {
		label: 'Undo',
		run: () => {
			runs += 1;
		},
	});
	expect(toast.action?.label).toBe('Undo');
	toast.act();
	toast.act();
	expect(runs).toBe(1);
	expect(toast.message).toBe('');
	expect(toast.action).toBeUndefined();
});

it('drops the action when hidden or replaced', () => {
	toast.show('Gone', null, undo);
	toast.hide();
	expect(toast.action).toBeUndefined();

	toast.show('Gone', null, undo);
	toast.show('Link copied to clipboard');
	expect(toast.action).toBeUndefined();
	toast.hide();
});
