import { describe, expect, it } from 'vitest';
import { parseDate, parseRecur } from './recurrence';
import {
	earliestBalanceDate,
	lastOccurrenceOnOrBefore,
	rollRecurringStarts,
	rollStartDate,
} from './rollRecurringStarts';

describe('rollStartDate', () => {
	it('lands one month before the last occurrence on or before the balance', () => {
		const recur = parseRecur('R')!;
		const start = new Date(2020, 11, 1);
		const anchor = new Date(2026, 8, 1);
		expect(lastOccurrenceOnOrBefore(start, recur, anchor)).toEqual(new Date(2026, 8, 1));
		expect(rollStartDate(start, recur, anchor)).toEqual(new Date(2026, 7, 1));
	});

	it('keeps a 30th after short months instead of locking in Feb drift', () => {
		const recur = parseRecur('R')!;
		const start = new Date(2020, 11, 30);
		expect(rollStartDate(start, recur, new Date(2026, 8, 1))).toEqual(new Date(2026, 6, 30));
	});
});

describe('rollRecurringStarts', () => {
	it('rolls 2020 monthly bills to the period before the B date', () => {
		const raw = [
			'B-CHCK1775-main|2026-09-01|2000|Balance Checking 1775',
			'--- Expenses:Entertainment',
			'D|2020-12-01,R|15|Spotify',
			'D|2020-12-30,R|19|Hulu',
			'D|2020-12-01,R|17|Netflix',
		].join('\n');

		const result = rollRecurringStarts(raw);

		expect(result.changed).toBe(3);
		expect(result.raw).toContain('D|2026-08-01,R|15|Spotify');
		expect(result.raw).toContain('D|2026-07-30,R|19|Hulu');
		expect(result.raw).toContain('D|2026-08-01,R|17|Netflix');
		expect(result.raw).toContain('B-CHCK1775-main|2026-09-01|2000|Balance Checking 1775');
		expect(result.examples.map((e) => e.desc)).toEqual(['Spotify', 'Hulu', 'Netflix']);
	});

	it('leaves a start that is already one period before the balance', () => {
		const raw = ['B-MAIN-main|2026-09-01|100|Balance', 'D|2026-08-01,R|15|Spotify'].join('\n');
		const result = rollRecurringStarts(raw);
		expect(result.changed).toBe(0);
		expect(result.raw).toBe(raw);
	});

	it('does not move a counted series', () => {
		const raw = ['B-MAIN-main|2026-09-01|100|Balance', 'C|2020-01-01,RW5|50|Temp gig'].join('\n');
		expect(rollRecurringStarts(raw).changed).toBe(0);
	});

	it('keeps business-day shift and an end date', () => {
		const raw = ['B-MAIN-main|2026-09-01|100|Balance', 'D|2020-09-01,R<,2030-01-01|1645|Rent'].join(
			'\n',
		);
		const result = rollRecurringStarts(raw);
		expect(result.raw).toContain('D|2026-08-01,R<,2030-01-01|1645|Rent');
	});

	it('rewrites last-day-of-month tokens as -L', () => {
		const raw = ['B-MAIN-main|2026-09-01|100|Balance', 'D|2020-01-L,RML|1200|Mortgage'].join('\n');
		const result = rollRecurringStarts(raw);
		expect(result.raw).toContain('D|2026-07-L,RML|1200|Mortgage');
	});

	it('remaps occurrence overrides onto the new series', () => {
		const start = parseDate('2020-12-01,R')!.startDate!;
		expect(lastOccurrenceOnOrBefore(start, parseRecur('R')!, new Date(2021, 3, 1))).toEqual(
			new Date(2021, 3, 1),
		);

		const raw = [
			'B-MAIN-main|2026-09-01|100|Balance',
			'D|2020-12-01,R|80|Groceries|#5=2021-04-01:65|#69=pending',
		].join('\n');
		const result = rollRecurringStarts(raw);
		expect(result.raw).toContain('D|2026-08-01,R|80|Groceries|#1=pending');
		expect(result.raw).not.toContain('#5=');
	});

	it('rolls a disabled line and leaves the prefix', () => {
		const raw = ['B-MAIN-main|2026-09-01|100|Balance', '!D|2020-12-01,R|15|Spotify'].join('\n');
		expect(rollRecurringStarts(raw).raw).toContain('!D|2026-08-01,R|15|Spotify');
	});

	it('uses an explicit anchor when there is no B line', () => {
		const raw = 'D|2020-12-01,R|15|Spotify';
		const result = rollRecurringStarts(raw, new Date(2026, 8, 15));
		expect(result.raw).toBe('D|2026-08-01,R|15|Spotify');
	});

	it('reads the earliest B date', () => {
		const raw = [
			'B-SAV-main|2026-10-01|50|Savings',
			'B-CHCK-main|2026-09-01|2000|Checking',
		].join('\n');
		expect(earliestBalanceDate(raw)).toEqual(new Date(2026, 8, 1));
	});
});
