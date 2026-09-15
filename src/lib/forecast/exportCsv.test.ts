import { describe, expect, it } from 'vitest';
import type { Account, ParsedEntry } from '$lib/parser/types';
import {
	csvEscape,
	fileSlug,
	forecastEntriesToCsv,
	forecastEntryCsvRow,
} from './exportCsv';

function entry(partial: Partial<ParsedEntry> & Pick<ParsedEntry, 'type' | 'date'>): ParsedEntry {
	return {
		id: 'e1',
		amount: 10,
		desc: 'Test',
		endDate: null,
		rawEntry: '',
		isMain: true,
		recur: null,
		mainBalance: 100,
		...partial,
	};
}

const checking: Account = {
	id: 'CHCK',
	name: 'Checking',
	isMain: true,
	startingBal: 100,
	runningBal: 100,
};

describe('csvEscape', () => {
	it('quotes commas and quotes', () => {
		expect(csvEscape('Rent')).toBe('Rent');
		expect(csvEscape('Rent, deposit')).toBe('"Rent, deposit"');
		expect(csvEscape('Say "hi"')).toBe('"Say ""hi"""');
	});
});

describe('fileSlug', () => {
	it('makes a filename-safe slug', () => {
		expect(fileSlug('Close month')).toBe('close-month');
		expect(fileSlug('???')).toBe('forecast');
	});
});

describe('forecastEntriesToCsv', () => {
	it('writes a header and one credit row', () => {
		const csv = forecastEntriesToCsv(
			[
				entry({
					type: 'C',
					date: new Date(2026, 8, 1),
					amount: 1684,
					desc: 'Paycheck',
					accountId: 'CHCK',
					mainBalance: 3524,
					occurrenceIndex: 1,
				}),
			],
			{ CHCK: checking },
			true,
		);
		expect(csv.startsWith('\uFEFF')).toBe(true);
		expect(csv).toContain('date,type,description,credit,debit,balance');
		expect(csv).toContain('2026-09-01,C,Paycheck,1684,,3524');
		expect(csv).toContain('Checking');
	});

	it('leaves credit empty on a debit', () => {
		const row = forecastEntryCsvRow(
			entry({
				type: 'D',
				date: new Date(2026, 8, 2),
				amount: 14,
				desc: 'Lunch',
				accountId: 'CHCK',
				mainBalance: 90,
			}),
			{ CHCK: checking },
			true,
		);
		expect(row[3]).toBe('');
		expect(row[4]).toBe('14');
	});
});
