import { computeForecastSummary } from '$lib/parser/forecastSummary';
import { fmt } from '$lib/formatters/fmt';
import type { BalanceFlags, ParsedEntry } from '$lib/parser/types';

const REPLY_RULES =
	'Use only numbers and names in the brief. Do not invent transactions. Do not give investment or tax advice. No preamble. No markdown fences.';

export const EXPLAIN_SYSTEM = `You are a Labs helper inside ForeBalance. The brief is already computed.
${REPLY_RULES}

Reply with exactly three short labeled lines:
Tight: date, balance, and the named line that caused the lowest point
Watch: the next risky date, or "none in this window"
Try: one concrete change (skip, move, or add one .psv line)`;

export const UPCOMING_SYSTEM = `You are a Labs helper inside ForeBalance.
${REPLY_RULES}

List the Upcoming lines, one per row: date, C or D, amount, name, balance after.
Then one sentence: which of those is the squeeze.`;

export const DRAINS_SYSTEM = `You are a Labs helper inside ForeBalance.
${REPLY_RULES}

List Top debits largest first (name, total, times).
Then one sentence: which single change would add the most room before the lowest date.`;

export const AFFORD_SYSTEM = `You are a Labs helper inside ForeBalance. The user is asking whether they can afford something.
${REPLY_RULES}

Answer Yes, Tight, or No. Then one sentence using the lowest point and the uncomfortable line.
Then one .psv line they could add to test it (TYPE|WHEN|AMOUNT|DESCRIPTION).`;

export const DRAFT_SYSTEM = `You write ForeBalance .psv lines only.
Format: TYPE|WHEN|AMOUNT|DESCRIPTION
Types: B (balance as of a date), C (credit), D (debit).
Recurrence examples: 2026-09-01,R  |  2026-09-05,RW  |  2026-09-01,R2W
No markdown fences. No commentary.`;

export const FREE_SYSTEM =
	'You are a Labs helper inside ForeBalance. Be brief. Do not invent account numbers. Answer the question; do not restate it.';

const MAX_LINES = 20;
const MAX_UPCOMING = 8;
const MAX_DRAINS = 5;

export function splitModelReply(text: string): { thinking: string; answer: string } {
	const blocks = [...text.matchAll(/<think>([\s\S]*?)<\/think>/gi)].map((match) =>
		match[1].trim(),
	);
	const dangling = text.match(/<think>([\s\S]*)$/i);
	if (dangling && !dangling[0].includes('</think>')) {
		blocks.push(dangling[1].trim());
	}
	const answer = text
		.replace(/<think>[\s\S]*?<\/think>/gi, '')
		.replace(/<think>[\s\S]*$/i, '')
		.trim();
	return {
		thinking: blocks.filter(Boolean).join('\n\n'),
		answer: answer || text.replace(/<\/?think>/gi, '').trim(),
	};
}

function displayName(desc: string | null): string {
	return (desc ?? '(no description)').replace(/\s*\(#\d+(?:\/\d+)?\)\s*$/, '').trim();
}

function moneyAmount(entry: ParsedEntry): number | null {
	const amount = Number(entry.amount);
	return Number.isFinite(amount) ? amount : null;
}

function runningBalance(entry: ParsedEntry, useMainBalance: boolean): number | undefined {
	return useMainBalance ? entry.mainBalance : (entry.balance ?? entry.mainBalance);
}

function formatMoneyLine(entry: ParsedEntry, useMainBalance: boolean): string {
	const amount = moneyAmount(entry);
	const bal = runningBalance(entry, useMainBalance);
	const when = entry.date ? fmt.date(entry.date) : '?';
	return `${when} ${entry.type} ${amount === null ? entry.amount : fmt.curr(amount)} ${displayName(entry.desc)} → ${bal === undefined ? '?' : fmt.curr(bal)}`;
}

function topDebits(entries: ParsedEntry[]): string[] {
	const grouped = new Map<string, { total: number; count: number; typical: number }>();
	for (const entry of entries) {
		if (entry.type !== 'D' || !entry.date) continue;
		const amount = moneyAmount(entry);
		if (amount === null) continue;
		const key = displayName(entry.desc);
		const current = grouped.get(key) ?? { total: 0, count: 0, typical: amount };
		current.total += amount;
		current.count += 1;
		grouped.set(key, current);
	}
	return [...grouped.entries()]
		.sort((a, b) => b[1].total - a[1].total)
		.slice(0, MAX_DRAINS)
		.map(
			([name, stats]) =>
				`${name}: ${fmt.curr(stats.total)} (${stats.count}× ${fmt.curr(stats.typical)})`,
		);
}

function upcomingLines(entries: ParsedEntry[], useMainBalance: boolean): string[] {
	const start = new Date();
	start.setHours(0, 0, 0, 0);
	const money = entries.filter(
		(entry) => entry.date && (entry.type === 'C' || entry.type === 'D'),
	);
	const fromToday = money.filter((entry) => entry.date && entry.date >= start);
	const window = (fromToday.length ? fromToday : money).slice(0, MAX_UPCOMING);
	return window.map((entry) => formatMoneyLine(entry, useMainBalance));
}

export function buildForecastBrief(
	entries: ParsedEntry[],
	balanceFlags: BalanceFlags,
	useMainBalance: boolean,
	scenarioName: string,
): string {
	const summary = computeForecastSummary(entries, balanceFlags, useMainBalance);
	const lines: string[] = [`Scenario: ${scenarioName || 'Untitled'}`];
	lines.push(
		`Thresholds: uncomfortable ${fmt.curr(balanceFlags.below.uncomfortable)}, low ${fmt.curr(balanceFlags.below.low)}, zero ${fmt.curr(balanceFlags.below.negative)}`,
	);

	if (summary.lowest) {
		const cause = entries[summary.lowest.rowIndex];
		lines.push(
			`Lowest: ${fmt.curr(summary.lowest.balance)} on ${fmt.date(summary.lowest.date)}`,
		);
		if (cause) {
			lines.push(`Lowest after: ${formatMoneyLine(cause, useMainBalance)}`);
		}
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

	const drains = topDebits(entries);
	if (drains.length) {
		lines.push('Top debits:');
		for (const drain of drains) lines.push(drain);
	}

	const upcoming = upcomingLines(entries, useMainBalance);
	if (upcoming.length) {
		lines.push('Upcoming:');
		for (const line of upcoming) lines.push(line);
	}

	const money = entries.filter(
		(entry) => entry.date && (entry.type === 'C' || entry.type === 'D' || entry.type === 'B'),
	);
	lines.push('Lines:');
	for (const entry of money.slice(0, MAX_LINES)) {
		lines.push(formatMoneyLine(entry, useMainBalance));
	}
	if (money.length > MAX_LINES) {
		lines.push(`… ${money.length - MAX_LINES} more lines omitted.`);
	}
	return lines.join('\n');
}
