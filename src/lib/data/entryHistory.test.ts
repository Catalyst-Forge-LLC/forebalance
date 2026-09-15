import { get } from 'svelte/store';
import { beforeEach, describe, expect, it } from 'vitest';
import {
	HISTORY_LIMIT,
	clearEntryHistory,
	entryHistoryStore,
	formatHistoryLabel,
	historySnippet,
	listEntryVersions,
	pruneEntryHistory,
	recordEntryVersion,
} from './entryHistory';

describe('entryHistory', () => {
	beforeEach(() => {
		clearEntryHistory();
	});

	it('records the previous text and skips an identical top snapshot', () => {
		recordEntryVersion('set-a', 'v1');
		recordEntryVersion('set-a', 'v1');
		recordEntryVersion('set-a', 'v2');
		expect(listEntryVersions('set-a').map((v) => v.raw)).toEqual(['v2', 'v1']);
	});

	it('keeps only the last N versions', () => {
		for (let i = 0; i < HISTORY_LIMIT + 5; i++) {
			recordEntryVersion('set-a', `v${i}`);
		}
		const versions = listEntryVersions('set-a');
		expect(versions).toHaveLength(HISTORY_LIMIT);
		expect(versions[0].raw).toBe(`v${HISTORY_LIMIT + 4}`);
		expect(versions.at(-1)?.raw).toBe('v5');
	});

	it('keeps histories per scenario', () => {
		recordEntryVersion('a', 'one');
		recordEntryVersion('b', 'two');
		expect(listEntryVersions('a')[0].raw).toBe('one');
		expect(listEntryVersions('b')[0].raw).toBe('two');
	});

	it('prunes one scenario and can clear all', () => {
		recordEntryVersion('a', 'one');
		recordEntryVersion('b', 'two');
		pruneEntryHistory('a');
		expect(listEntryVersions('a')).toEqual([]);
		expect(listEntryVersions('b')).toHaveLength(1);
		clearEntryHistory();
		expect(get(entryHistoryStore)).toEqual({});
	});
});

describe('history labels', () => {
	it('uses today, yesterday, and a short date', () => {
		const now = new Date(2026, 8, 15, 16, 7);
		expect(formatHistoryLabel(new Date(2026, 8, 15, 15, 2).toISOString(), now)).toMatch(
			/^Today /,
		);
		expect(formatHistoryLabel(new Date(2026, 8, 14, 9, 14).toISOString(), now)).toMatch(
			/^Yesterday /,
		);
		expect(formatHistoryLabel(new Date(2026, 8, 1, 11, 0).toISOString(), now)).toContain('Sep');
	});

	it('snips the first real line', () => {
		expect(historySnippet('--- Income\nC|2026-09-01,R|10|Paycheck\n')).toBe(
			'C|2026-09-01,R|10|Paycheck',
		);
		expect(historySnippet('x'.repeat(50)).endsWith('…')).toBe(true);
	});
});
