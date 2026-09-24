import { describe, expect, it } from 'vitest';
import { compareScenarios, diffScenarioLines } from '$lib/forecast/scenarioCompare';
import type { BalanceFlags } from '$lib/parser/types';

const flags: BalanceFlags = {
	below: { negative: 0, low: 0, uncomfortable: 0 },
	above: { goal: 0 },
};

const base = `B-CHCK-main|2026-09-01|2000|Checking
D-CO|2026-09-18,R|500|Capital One|CO|1000|0
D|2026-09-05,R|40|Groceries`;

describe('diffScenarioLines', () => {
	it('reports added, removed, and changed lines', () => {
		expect(diffScenarioLines('A\nB', 'A\nC\nD')).toEqual([
			{ kind: 'changed', before: 'B', after: 'C' },
			{ kind: 'added', after: 'D' },
		]);
	});
});

describe('compareScenarios', () => {
	it('compares ending balance and a shared debt', () => {
		const extra = base.replace('|500|Capital One', '|800|Capital One');
		const compared = compareScenarios(base, extra, 4, flags, {
			useFederalHolidays: false,
			balanceIncludesSameDay: true,
		}, new Date(2026, 8, 1));
		expect(compared.left?.debts[0]?.payoff).toBeTruthy();
		expect(compared.right?.debts[0]?.name).toContain('Capital One');
		expect(compared.lines.some((line) => line.kind === 'changed')).toBe(true);
		expect(compared.left?.months.length).toBeGreaterThan(0);
	});
});
