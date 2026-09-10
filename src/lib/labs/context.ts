import { computeForecastSummary } from '$lib/parser/forecastSummary';
import { fmt } from '$lib/formatters/fmt';
import type { BalanceFlags, ParsedEntry } from '$lib/parser/types';

export const EXPLAIN_SYSTEM =
	'You are a Labs helper inside ForeBalance, a private cashflow tool. Explain the forecast in plain English. Do not invent transactions. Do not give investment or tax advice. Be brief.';

export const DRAFT_SYSTEM = `You write ForeBalance .psv lines only.
Format: TYPE|WHEN|AMOUNT|DESCRIPTION
Types: B (balance as of a date), C (credit), D (debit).
Recurrence examples: 2026-09-01,R  |  2026-09-05,RW  |  2026-09-01,R2W
No markdown fences. No commentary.`;

const MAX_LINES = 40;

export function buildForecastBrief(
	entries: ParsedEntry[],
	balanceFlags: BalanceFlags,
	useMainBalance: boolean,
	scenarioName: string,
): string {
	const summary = computeForecastSummary(entries, balanceFlags, useMainBalance);
	const lines: string[] = [`Scenario: ${scenarioName || 'Untitled'}`];

	if (summary.lowest) {
		lines.push(
			`Lowest: ${fmt.curr(summary.lowest.balance)} on ${fmt.date(summary.lowest.date)}`,
		);
	}
	if (summary.firstNegative) {
		lines.push(
			`First negative: ${fmt.curr(summary.firstNegative.balance)} on ${fmt.date(summary.firstNegative.date)}`,
		);
	} else if (summary.firstUncomfortable) {
		lines.push(
			`First uncomfortable: ${fmt.curr(summary.firstUncomfortable.balance)} on ${fmt.date(summary.firstUncomfortable.date)}`,
		);
	} else {
		lines.push('Stays above the uncomfortable line.');
	}
	if (summary.daysBelowUncomfortable > 0) {
		lines.push(
			`Days: ${summary.daysBelowUncomfortable} under uncomfortable, ${summary.daysBelowLow} under low, ${summary.daysBelowZero} below zero.`,
		);
	}

	const money = entries.filter((entry) => entry.date && (entry.type === 'C' || entry.type === 'D' || entry.type === 'B'));
	lines.push('Lines:');
	for (const entry of money.slice(0, MAX_LINES)) {
		const bal = useMainBalance ? entry.mainBalance : (entry.balance ?? entry.mainBalance);
		const amount = entry.type === 'B' ? entry.amount : entry.amount;
		lines.push(
			`${fmt.date(entry.date)} ${entry.type} ${fmt.curr(amount)} ${entry.desc ?? ''} → ${bal === undefined ? '?' : fmt.curr(bal)}`,
		);
	}
	if (money.length > MAX_LINES) {
		lines.push(`… ${money.length - MAX_LINES} more lines omitted.`);
	}
	return lines.join('\n');
}
