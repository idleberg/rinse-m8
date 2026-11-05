/// <reference types="bun" />

import { expect, test as it } from 'bun:test';
import { choose, confirm, confirmation } from './confirm.svelte';

const question = {
	title: 'Clear Queue',
	message: 'Clear the play queue?',
	primaryAction: 'Clear',
	secondaryAction: 'Cancel',
};

it('shows the question until it is answered', async () => {
	const answer = confirm(question);

	expect(confirmation.question).toEqual(question);
	confirmation.answer('primary');
	expect(await answer).toBe(true);
	expect(confirmation.question).toBeNull();
});

it('resolves false when declined', async () => {
	const answer = confirm(question);

	confirmation.answer();
	expect(await answer).toBe(false);
});

it('declines a second question while one is showing', async () => {
	const first = confirm(question);

	expect(await confirm({ ...question, title: 'Other' })).toBe(false);
	expect(confirmation.question).toEqual(question);
	confirmation.answer('primary');
	expect(await first).toBe(true);
});

it('tells the secondary action apart from dismissing', async () => {
	const twoAnswers = { ...question, secondaryAction: 'Queue' };
	const secondary = choose(twoAnswers);

	confirmation.answer('secondary');
	expect(await secondary).toBe('secondary');

	const dismissed = choose(twoAnswers);

	confirmation.answer();
	expect(await dismissed).toBeUndefined();
});
