import { describe, expect, it } from 'vitest';
import { parseRecur, parseDate, sortEntries, updateDateRecur } from './recurrence';
import { parseEntries } from './parseEntries';
import type { BalanceFlags } from './types';

const balanceFlags: BalanceFlags = {
	below: { negative: 0, low: 500, uncomfortable: 1000 },
	above: { goal: 5000 },
};

describe('parseRecur', () => {
	it('parses monthly default', () => {
		expect(parseRecur('R')).toEqual({
			freq: 'M',
			multiple: 1,
			count: null,
			recurRaw: 'R',
		});
	});

	it('parses biweekly with count', () => {
		expect(parseRecur('R2W5')).toEqual({
			freq: 'W',
			multiple: 2,
			count: 5,
			recurRaw: 'R2W5',
		});
	});
});

describe('parseDate', () => {
	it('parses single date', () => {
		const result = parseDate('2026-04-01');
		expect(result?.[0]).toEqual(new Date(2026, 3, 1));
		expect(result?.[1]).toBeNull();
	});

	it('parses recurring date', () => {
		const result = parseDate('2026-04-01,R2W');
		expect(result?.[1]?.freq).toBe('W');
		expect(result?.[1]?.multiple).toBe(2);
	});
});

describe('sortEntries', () => {
	it('sorts by date then type (B, C, D) then entry order', () => {
		const entries = [
			{ date: new Date(2026, 0, 15), type: 'D', entryOrder: 1 },
			{ date: new Date(2026, 0, 15), type: 'C', entryOrder: 0 },
			{ date: new Date(2026, 0, 1), type: 'B', entryOrder: 2 },
		];
		const sorted = sortEntries(entries);
		expect(sorted[0].type).toBe('B');
		expect(sorted[1].type).toBe('C');
		expect(sorted[2].type).toBe('D');
	});
});

describe('parseEntries', () => {
	it('returns null for invalid entries', () => {
		expect(parseEntries('', 6, balanceFlags)).toEqual([null, null]);
	});

	it('projects balance from a simple forecast', () => {
		const raw = `B-CHCK-main|2026-01-01|1000|Starting balance
C|2026-01-15|500|Paycheck
D|2026-01-20|200|Rent`;

		const [accountEntries, accounts] = parseEntries(raw, 3, balanceFlags);
		expect(accounts).not.toBeNull();
		expect(accountEntries).not.toBeNull();

		const mainId = Object.values(accounts!).find((a) => a.isMain)!.id;
		const rows = accountEntries![mainId];
		expect(rows.length).toBeGreaterThan(0);
		expect(rows.at(-1)?.mainBalance).toBe(1300);
	});

	it('expands recurring debits within forecast window', () => {
		const raw = `B-CHCK-main|2026-01-01|5000|Balance
D|2026-01-01,R|1000|Rent`;

		const [accountEntries] = parseEntries(raw, 3, balanceFlags);
		const mainId = Object.keys(accountEntries!)[0];
		const rentRows = accountEntries![mainId].filter((e) => e.desc?.includes('Rent'));
		expect(rentRows.length).toBe(4);
	});
});

describe('updateDateRecur', () => {
	it('advances monthly', () => {
		const recur = parseRecur('R')!;
		const next = updateDateRecur(new Date(2026, 0, 15), recur);
		expect(next.getMonth()).toBe(1);
	});
});
