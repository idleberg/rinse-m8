/// <reference types="bun" />

import { expect, test as it } from 'bun:test';
import { confirm, confirmation } from './confirm.svelte';

const question = { title: 'Clear Queue', message: 'Clear the play queue?', action: 'Clear' };

it('shows the question until it is answered', async () => {
	const answer = confirm(question);

	expect(confirmation.question).toEqual(question);
	confirmation.answer(true);
	expect(await answer).toBe(true);
	expect(confirmation.question).toBeNull();
});

it('resolves false when declined', async () => {
	const answer = confirm(question);

	confirmation.answer(false);
	expect(await answer).toBe(false);
});

it('declines a second question while one is showing', async () => {
	const first = confirm(question);

	expect(await confirm({ ...question, title: 'Other' })).toBe(false);
	expect(confirmation.question).toEqual(question);
	confirmation.answer(true);
	expect(await first).toBe(true);
});
