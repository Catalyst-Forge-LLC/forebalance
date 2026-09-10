import { describe, expect, it } from 'vitest';
import { buildForecastBrief, buildWhyTight, splitModelReply } from './context';
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
		date: (() => {
			const [year, month, day] = date.split('-').map(Number);
			return new Date(year, month - 1, day);
		})(),
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

describe('buildWhyTight', () => {
	it('names the debit, the gap, and a relief what-if', () => {
		const text = buildWhyTight(
			[
				row(0, '2026-09-01', 'B', 1000, 1000, 'Start'),
				row(1, '2026-09-02', 'D', 800, 200, 'Rent (#1)'),
				row(2, '2026-09-09', 'D', 40, 160, 'Groceries (#1)'),
			],
			flags,
			true,
			'Close month',
		);
		expect(text).toContain('Tight:');
		expect(text).toContain('Groceries');
		expect(text).toContain('debit $40');
		expect(text).toContain('under your uncomfortable line');
		expect(text).toContain('Watch:');
		expect(text).toContain('after Rent');
		expect(text).toContain('Prefix the Groceries line with !');
		expect(text).toContain('C|2026-09-08|440|Buffer before Groceries');
	});

	it('says when the window is not actually tight', () => {
		const text = buildWhyTight(
			[
				row(0, '2026-09-01', 'B', 4000, 4000, 'Start'),
				row(1, '2026-09-17', 'D', 488, 3512, 'IRS (#1)'),
				row(2, '2026-09-18', 'C', 4700, 8212, 'Pay'),
			],
			flags,
			true,
			'Comfortable',
		);
		expect(text).toContain('IRS');
		expect(text).toContain('above your uncomfortable line');
		expect(text).toContain('Stays above the uncomfortable line');
		expect(text).not.toMatch(/Try:.*\nD /);
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
