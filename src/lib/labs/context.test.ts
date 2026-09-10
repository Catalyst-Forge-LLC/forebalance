import { describe, expect, it } from 'vitest';
import { buildForecastBrief } from './context';
import type { BalanceFlags, ParsedEntry } from '$lib/parser/types';

const flags: BalanceFlags = {
	below: { negative: 0, low: 200, uncomfortable: 500 },
	above: { goal: 2500 },
};

function row(i: number, date: string, type: ParsedEntry['type'], amount: number, balance: number): ParsedEntry {
	return {
		id: String(i),
		type,
		date: new Date(date),
		amount,
		desc: type === 'C' ? 'Pay' : 'Bill',
		endDate: null,
		rawEntry: '',
		isMain: true,
		recur: null,
		mainBalance: balance,
		balance,
	};
}

describe('buildForecastBrief', () => {
	it('names the scenario and the lowest point', () => {
		const brief = buildForecastBrief(
			[
				row(0, '2026-09-01', 'B', 1000, 1000),
				row(1, '2026-09-02', 'D', 800, 200),
			],
			flags,
			true,
			'Close month',
		);
		expect(brief).toContain('Scenario: Close month');
		expect(brief).toContain('Lowest:');
		expect(brief).toContain('Lines:');
	});
});
