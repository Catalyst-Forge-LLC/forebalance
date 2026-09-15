import { describe, expect, it } from 'vitest';
import { githubSlug, tocFromMarkdown } from './toc';

describe('githubSlug', () => {
	it('matches the in-page Help anchors', () => {
		expect(githubSlug('TYPE')).toBe('type');
		expect(githubSlug('One occurrence')).toBe('one-occurrence');
		expect(githubSlug('Debt and sub-accounts')).toBe('debt-and-sub-accounts');
		expect(githubSlug("Balance already includes today's items")).toBe(
			'balance-already-includes-todays-items',
		);
	});
});

describe('tocFromMarkdown', () => {
	it('collects h2 headings', () => {
		const toc = tocFromMarkdown('## TYPE\n\nHello\n\n## WHEN\n');
		expect(toc).toEqual([
			{ id: 'type', text: 'TYPE', level: 2 },
			{ id: 'when', text: 'WHEN', level: 2 },
		]);
	});
});
