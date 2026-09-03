import { describe, expect, it } from 'vitest';
import { computeForecastSummary } from './forecastSummary';
import type { BalanceFlags, ParsedEntry } from './types';

const balanceFlags: BalanceFlags = {
	below: { negative: 0, low: 500, uncomfortable: 1000 },
	above: { goal: 5000 },
};

function entry(
	rowIndex: number,
	date: string,
	mainBalance: number,
): ParsedEntry {
	return {
		id: String(rowIndex),
		type: 'D',
		date: new Date(date),
		amount: 0,
		desc: 'test',
		endDate: null,
		rawEntry: '',
		isMain: false,
		recur: null,
		mainBalance,
	};
}

describe('computeForecastSummary', () => {
	it('finds lowest balance', () => {
		const entries = [
			entry(0, '2026-01-01', 2000),
			entry(1, '2026-01-15', 750),
			entry(2, '2026-02-01', 1200),
		];
		const summary = computeForecastSummary(entries, balanceFlags);
		expect(summary.lowest?.balance).toBe(750);
		expect(summary.lowest?.rowIndex).toBe(1);
	});

	it('detects first uncomfortable crossing', () => {
		const entries = [
			entry(0, '2026-01-01', 1500),
			entry(1, '2026-01-15', 900),
		];
		const summary = computeForecastSummary(entries, balanceFlags);
		expect(summary.firstUncomfortable?.rowIndex).toBe(1);
	});

	it('counts days below thresholds', () => {
		const entries = [
			entry(0, '2026-01-01', 900),
			entry(1, '2026-01-02', 800),
			entry(2, '2026-02-01', 1500),
		];
		const summary = computeForecastSummary(entries, balanceFlags);
		expect(summary.daysBelowUncomfortable).toBe(2);
		expect(summary.daysBelowLow).toBe(0);
	});
});
