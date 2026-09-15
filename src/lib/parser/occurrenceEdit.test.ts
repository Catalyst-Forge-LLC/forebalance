import { describe, expect, it } from 'vitest';
import { applyForecastEdit, parseOverrideField } from './occurrenceEdit';
import { parseEntries } from './parseEntries';
import { localIsoDate } from '$lib/formatters/dates';
import type { BalanceFlags, ParsedEntry } from './types';

const balanceFlags: BalanceFlags = {
	below: { negative: 0, low: 500, uncomfortable: 1000 },
	above: { goal: 5000 },
};

function groceries() {
	const raw = `B-CHCK-main|2026-01-01|2000|Balance
D|2026-01-02,RW|80|Groceries|#5=2026-01-28:65`;
	const [accountEntries] = parseEntries(raw, 3, balanceFlags);
	const rows = accountEntries!.CHCK.filter((e) => e.desc?.includes('Groceries'));
	return { raw, rows };
}

describe('parseOverrideField', () => {
	it('parses amount, date, and both', () => {
		expect(parseOverrideField('#5=65')).toEqual({ n: 5, value: { amount: 65 } });
		expect(parseOverrideField('#5=2026-01-28')).toEqual({
			n: 5,
			value: { date: '2026-01-28' },
		});
		expect(parseOverrideField('#5=2026-01-28:65')).toEqual({
			n: 5,
			value: { date: '2026-01-28', amount: 65 },
		});
	});

	it('parses pending alone or as a suffix', () => {
		expect(parseOverrideField('#1=pending')).toEqual({ n: 1, value: { pending: true } });
		expect(parseOverrideField('#5=65+pending')).toEqual({
			n: 5,
			value: { amount: 65, pending: true },
		});
		expect(parseOverrideField('#5=2026-01-28:65+pending')).toEqual({
			n: 5,
			value: { date: '2026-01-28', amount: 65, pending: true },
		});
	});
});

describe('occurrence overrides', () => {
	it('changes only that occurrence and keeps the series cadence', () => {
		const { rows } = groceries();
		expect(rows.length).toBeGreaterThan(6);
		const fifth = rows.find((e) => e.occurrenceIndex === 5)!;
		const sixth = rows.find((e) => e.occurrenceIndex === 6)!;
		expect(localIsoDate(fifth.date)).toBe('2026-01-28');
		expect(+fifth.amount).toBe(65);
		expect(fifth.overridden).toBe(true);
		expect(localIsoDate(sixth.date)).toBe('2026-02-06');
		expect(+sixth.amount).toBe(80);
		expect(sixth.overridden).toBeFalsy();
	});

	it('does not treat #5= as an account id', () => {
		const raw = `B-CHCK-main|2026-01-01|2000|Balance
D|2026-01-02,RW|80|Groceries|#5=65`;
		const [, accounts] = parseEntries(raw, 2, balanceFlags);
		expect(Object.keys(accounts!)).toEqual(['CHCK']);
	});

	it('keeps debt fields when an override is appended', () => {
		const raw = `B-CHCK-main|2026-01-01|5000|Balance
D-CO|2026-01-15,R|150|Capital One-4321|CO|2800|19.99|#2=:175`;
		const [accountEntries, accounts] = parseEntries(raw, 3, balanceFlags);
		expect(accounts!.CO.startingBal).toBe(2800);
		expect(accounts!.CO.interestRate).toBe(19.99);
		const second = accountEntries!.CO.filter((e) => e.type === 'D')[1];
		expect(+second.amount).toBe(175);
	});

	it('writes a recurring edit as #N= and can clear it', () => {
		const raw = `B-CHCK-main|2026-01-01|2000|Balance
D|2026-01-02,RW|80|Groceries`;
		const [accountEntries] = parseEntries(raw, 3, balanceFlags);
		const fifth = accountEntries!.CHCK.find((e) => e.occurrenceIndex === 5 && e.desc?.includes('Groceries'))!;
		const updated = applyForecastEdit(raw, fifth, { date: '2026-01-28', amount: 65 });
		expect(updated).toContain('D|2026-01-02,RW|80|Groceries|#5=2026-01-28:65');

		const [again] = parseEntries(updated, 3, balanceFlags);
		const edited = again!.CHCK.find((e) => e.occurrenceIndex === 5 && e.desc?.includes('Groceries')) as ParsedEntry;
		const cleared = applyForecastEdit(updated, edited, {
			date: localIsoDate(edited.seriesDate),
			amount: edited.baseAmount ?? 80,
		});
		expect(cleared).toBe(raw);
	});

	it('rewrites the whole series from a later occurrence', () => {
		const raw = `B-CHCK-main|2026-01-01|2000|Balance
D|2026-01-02,RW|80|Groceries|#5=65`;
		const [accountEntries] = parseEntries(raw, 3, balanceFlags);
		const fifth = accountEntries!.CHCK.find(
			(e) => e.occurrenceIndex === 5 && e.desc?.includes('Groceries'),
		)!;
		const updated = applyForecastEdit(raw, fifth, {
			date: '2026-01-29',
			amount: 90,
			scope: 'series',
		});
		expect(updated).toContain('D|2026-01-01,RW|90|Groceries');
		expect(updated).not.toContain('#5=');

		const [again] = parseEntries(updated, 3, balanceFlags);
		const rows = again!.CHCK.filter((e) => e.desc?.includes('Groceries'));
		expect(localIsoDate(rows.find((e) => e.occurrenceIndex === 1)?.date)).toBe('2026-01-01');
		expect(localIsoDate(rows.find((e) => e.occurrenceIndex === 5)?.date)).toBe('2026-01-29');
		expect(rows.every((e) => +e.amount === 90)).toBe(true);
	});

	it('writes #N=pending for a same-day occurrence that has not posted', () => {
		const raw = `B-CHCK-main|2026-01-01|2000|Balance
D|2026-01-01,R|500|Rent`;
		const [accountEntries] = parseEntries(raw, 2, balanceFlags);
		const first = accountEntries!.CHCK.find((e) => e.desc?.includes('Rent') && e.occurrenceIndex === 1)!;
		expect(first.inBalance).toBe(true);
		const updated = applyForecastEdit(raw, first, {
			date: '2026-01-01',
			amount: 500,
			pending: true,
		});
		expect(updated).toContain('D|2026-01-01,R|500|Rent|#1=pending');

		const [again] = parseEntries(updated, 2, balanceFlags);
		const posted = again!.CHCK.find((e) => e.desc?.includes('Rent') && e.occurrenceIndex === 1)!;
		expect(posted.pending).toBe(true);
		expect(posted.inBalance).toBe(false);
		expect(posted.mainBalance).toBe(1500);
	});

	it('rewrites a one-off line in place', () => {
		const raw = `B-CHCK-main|2026-01-01|2000|Balance
D|2026-01-20|200|Rent`;
		const [accountEntries] = parseEntries(raw, 2, balanceFlags);
		const rent = accountEntries!.CHCK.find((e) => e.desc === 'Rent')!;
		const updated = applyForecastEdit(raw, rent, { date: '2026-01-18', amount: 210 });
		expect(updated).toContain('D|2026-01-18|210|Rent');
		expect(updated).not.toContain('#1=');
	});
});
