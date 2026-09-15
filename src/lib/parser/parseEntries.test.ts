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
		expect(result?.startDate).toEqual(new Date(2026, 3, 1));
		expect(result?.recur).toBeNull();
	});

	it('parses recurring date', () => {
		const result = parseDate('2026-04-01,R2W');
		expect(result?.recur?.freq).toBe('W');
		expect(result?.recur?.multiple).toBe(2);
	});

	it('parses last-day-of-month token', () => {
		const result = parseDate('2026-01-L,RML');
		expect(result?.startDate?.getDate()).toBe(31);
		expect(result?.recur?.lastDayOfMonth).toBe(true);
	});

	it('parses business-day shift on recur', () => {
		const result = parseDate('2026-09-01,R<');
		expect(result?.businessDayShift).toBe('prev');
		expect(result?.recur?.freq).toBe('M');
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

	it('names debt accounts from DESCRIPTION and tracks remaining balance', () => {
		const raw = `B-CHCK-main|2026-01-01|5000|Balance Checking 1775
D-CO|2026-01-15,R|150|Capital One-4321|CO|2800|19.99`;

		const [, accounts] = parseEntries(raw, 3, balanceFlags);
		const debt = accounts!.CO;
		expect(debt.name).toBe('Capital One');
		expect(debt.lastFour).toBe('4321');
		expect(debt.startingBal).toBe(2800);
		expect(debt.interestRate).toBe(19.99);
		expect(debt.runningBal).toBeLessThan(debt.startingBal);
	});

	it('expands recurring debits within forecast window', () => {
		const raw = `B-CHCK-main|2026-01-01|5000|Balance
D|2026-01-01,R|1000|Rent`;

		const [accountEntries] = parseEntries(raw, 3, balanceFlags);
		const mainId = Object.keys(accountEntries!)[0];
		const rentRows = accountEntries![mainId].filter((e) => e.desc?.includes('Rent'));
		expect(rentRows.length).toBe(3);
	});

	it('applies same-day lines after B by default', () => {
		const raw = `B-CHCK-main|2026-09-15|2000|Balance
D|2026-09-15,R|500|Rent
C|2026-09-15|100|Deposit`;

		const [accountEntries] = parseEntries(raw, 1, balanceFlags);
		const mainId = Object.keys(accountEntries!)[0];
		const rows = accountEntries![mainId];
		expect(rows.map((e) => `${e.desc?.split(' ')[0]}:${e.mainBalance}`)).toEqual([
			'Balance:2000',
			'Deposit:2100',
			'Rent:1600',
		]);
		expect(rows.some((e) => e.inBalance)).toBe(false);
	});

	it('treats same-day lines as already in B when balanceIncludesSameDay is on', () => {
		const raw = `B-CHCK-main|2026-09-15|2000|Balance
D|2026-09-15,R|500|Rent
C|2026-09-15|100|Deposit
D|2026-09-16|50|Gas`;

		const [accountEntries] = parseEntries(raw, 2, balanceFlags, {
			balanceIncludesSameDay: true,
		});
		const mainId = Object.keys(accountEntries!)[0];
		const rows = accountEntries![mainId];
		expect(
			rows.map(
				(e) =>
					`${e.desc?.split(' ')[0]}#${e.occurrenceIndex}:${e.mainBalance}:${e.inBalance ? 'in' : 'post'}`,
			),
		).toEqual([
			'Balance#1:2000:post',
			'Deposit#1:2000:in',
			'Rent#1:2000:in',
			'Gas#1:1950:post',
			'Rent#2:1450:post',
		]);
	});

	it('does not touch a debt balance for an in-balance payment', () => {
		const raw = `B-CHCK-main|2026-09-15|2000|Balance
D-CO|2026-09-15,R|150|Capital One|CO|1000|0`;

		const [accountEntries, accounts] = parseEntries(raw, 2, balanceFlags, {
			balanceIncludesSameDay: true,
		});
		const mainId = Object.values(accounts!).find((a) => a.isMain)!.id;
		const rows = accountEntries![mainId];
		expect(rows[1]?.inBalance).toBe(true);
		expect(rows[1]?.subAccountRunningBal).toBeUndefined();
		expect(rows[2]?.subAccountRunningBal).toBe(850);
		expect(accounts!.CO.runningBal).toBe(850);
	});
});

describe('starter templates', () => {
	it('terminates when a single debt is paid off with an overpayment', () => {
		const raw = `B-CHK-main|2026-01-01|5000|Balance
C|2026-01-01,R|3000|Pay
D-CAR|2026-01-05,R|900|Car loan|CAR|1000|5`;
		const start = Date.now();
		const [entries] = parseEntries(raw, 6, balanceFlags);
		expect(Date.now() - start).toBeLessThan(2000);
		expect(entries).not.toBeNull();
	});

	it('parses all built-in starter profiles', async () => {
		const { entryTemplates } = await import('../data/entryTemplates');
		for (const template of entryTemplates) {
			const [accountEntries, accounts] = parseEntries(template.build('2026-09-'), 3, balanceFlags);
			expect(accounts, template.name).not.toBeNull();
			expect(accountEntries, template.name).not.toBeNull();
			const main = Object.values(accounts!).find((a) => a.isMain);
			expect(main, template.name).toBeTruthy();
			expect(accountEntries![main!.id].length, template.name).toBeGreaterThan(3);
		}
	});
});

describe('updateDateRecur', () => {
	it('advances monthly', () => {
		const recur = parseRecur('R')!;
		const next = updateDateRecur(new Date(2026, 0, 15), recur);
		expect(next.getMonth()).toBe(1);
	});
});
