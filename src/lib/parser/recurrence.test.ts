import { describe, expect, it } from 'vitest';
import { sortEntries, updateDateRecur, parseRecur } from './recurrence';
import { validateRawEntries, isEntryLineDisabled } from './validateEntries';
import { parseEntries } from './parseEntries';
import type { BalanceFlags } from './types';

const balanceFlags: BalanceFlags = {
	below: { negative: 0, low: 500, uncomfortable: 1000 },
	above: { goal: 5000 },
};

describe('sortEntries', () => {
	it('orders same day: balance reset, credits, debits, then entry order', () => {
		const entries = [
			{ date: new Date(2026, 0, 1), type: 'D', entryOrder: 2 },
			{ date: new Date(2026, 0, 1), type: 'C', entryOrder: 1 },
			{ date: new Date(2026, 0, 1), type: 'C', entryOrder: 0 },
			{ date: new Date(2026, 0, 1), type: 'B', entryOrder: 3 },
		];
		const sorted = sortEntries(entries);
		expect(sorted.map((e) => `${e.type}:${e.entryOrder}`)).toEqual([
			'B:3',
			'C:0',
			'C:1',
			'D:2',
		]);
	});
});

describe('updateDateRecur month-end', () => {
	it('clamps Jan 31 monthly recurrence to Feb 28/29', () => {
		const recur = parseRecur('R')!;
		const jan31 = new Date(2026, 0, 31);
		const feb = updateDateRecur(jan31, recur);
		expect(feb.getMonth()).toBe(1);
		expect(feb.getDate()).toBeLessThanOrEqual(28);
	});
});

describe('validateRawEntries', () => {
	it('flags malformed lines', () => {
		const warnings = validateRawEntries('not valid\nB|2026-01-01|100|ok');
		expect(warnings.length).toBeGreaterThan(0);
		expect(warnings[0].line).toBe(1);
	});

	it('ignores disabled and section lines', () => {
		const warnings = validateRawEntries('--- Section\n!D|2026-01-01|10|skip');
		expect(warnings).toEqual([]);
	});
});

describe('disabled entries', () => {
	it('excludes lines prefixed with ! from forecast', () => {
		const raw = `B-CHCK-main|2026-01-01|1000|Balance
!D|2026-01-05|999|Skipped rent
D|2026-01-10|100|Groceries`;
		const [accountEntries] = parseEntries(raw, 1, balanceFlags);
		const rows = accountEntries![Object.keys(accountEntries!)[0]];
		expect(rows.some((r) => r.desc?.includes('Skipped'))).toBe(false);
		expect(rows.some((r) => r.desc?.includes('Groceries'))).toBe(true);
	});
});

describe('isEntryLineDisabled', () => {
	it('detects ! and # prefixes', () => {
		expect(isEntryLineDisabled('!D|2026-01-01|10|x')).toBe(true);
		expect(isEntryLineDisabled('#D|2026-01-01|10|x')).toBe(true);
		expect(isEntryLineDisabled('D|2026-01-01|10|x')).toBe(false);
	});
});
