import { describe, expect, it } from 'vitest';
import { buildForecastBrief, splitModelReply } from './context';
import type { BalanceFlags, ParsedEntry } from '$lib/parser/types';

const flags: BalanceFlags = {
	below: { negative: 0, low: 200, uncomfortable: 500 },
	above: { goal: 2500 },
};

function row(
	i: number,
	date: string,
	type: ParsedEntry['type'],
	amount: number,
	balance: number,
	desc?: string,
): ParsedEntry {
	return {
		id: String(i),
		type,
		date: new Date(date),
		amount,
		desc: desc ?? (type === 'C' ? 'Pay' : 'Bill'),
		endDate: null,
		rawEntry: '',
		isMain: true,
		recur: null,
		mainBalance: balance,
		balance,
	};
}

describe('buildForecastBrief', () => {
	it('names the scenario, the lowest cause, and top debits', () => {
		const brief = buildForecastBrief(
			[
				row(0, '2026-09-01', 'B', 1000, 1000, 'Start'),
				row(1, '2026-09-02', 'D', 800, 200, 'Rent (#1)'),
				row(2, '2026-09-09', 'D', 40, 160, 'Groceries (#1)'),
			],
			flags,
			true,
			'Close month',
		);
		expect(brief).toContain('Scenario: Close month');
		expect(brief).toContain('Lowest:');
		expect(brief).toContain('Lowest after:');
		expect(brief).toContain('Top debits:');
		expect(brief).toContain('Rent:');
		expect(brief).toContain('Lines:');
	});
});

describe('splitModelReply', () => {
	it('hides think blocks and keeps the answer', () => {
		const reply = splitModelReply(
			'<think>Let me restated the assignment.</think>\nTight: rent week is $200.',
		);
		expect(reply.thinking).toContain('assignment');
		expect(reply.answer).toBe('Tight: rent week is $200.');
		expect(reply.answer).not.toContain('<think>');
	});
});
