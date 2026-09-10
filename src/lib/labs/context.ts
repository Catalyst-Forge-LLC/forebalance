import { computeForecastSummary } from '$lib/parser/forecastSummary';
import { localIsoDate } from '$lib/formatters/dates';
import { fmt } from '$lib/formatters/fmt';
import type { BalanceFlags, ParsedEntry } from '$lib/parser/types';

const REPLY_RULES =
	'Use only numbers and names in the brief. Do not invent transactions. Do not give investment or tax advice. No preamble. No markdown fences.';

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

export const DRAFT_SYSTEM = `You write ForeBalance .psv lines only, using the format card.
No markdown fences. No commentary. Do not invent a grid or extra columns.`;

export const FREE_SYSTEM = `You answer ForeBalance .psv questions using only the format card below.
If the card does not say, reply: Not in the format card — see the Help tab.
Never invent grids, matrices, row numbers, or other products. Be brief.`;

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

function vsThreshold(balance: number, threshold: number, label: string): string {
	const gap = balance - threshold;
	if (gap >= 0) {
		return `${fmt.curr(gap)} above your ${label} line (${fmt.curr(threshold)})`;
	}
	return `${fmt.curr(-gap)} under your ${label} line (${fmt.curr(threshold)})`;
}

function nextMoneyAfter(
	entries: ParsedEntry[],
	rowIndex: number,
	useMainBalance: boolean,
): ParsedEntry | undefined {
	return entries.slice(rowIndex + 1).find((entry) => {
		if (!entry.date || (entry.type !== 'C' && entry.type !== 'D')) return false;
		return runningBalance(entry, useMainBalance) !== undefined;
	});
}

function dayBefore(date: Date): Date {
	const previous = new Date(date.getTime());
	previous.setDate(previous.getDate() - 1);
	return previous;
}

/** Instant “Why is this tight?” — numbers from the table, not the model. */
export function buildWhyTight(
	entries: ParsedEntry[],
	balanceFlags: BalanceFlags,
	useMainBalance: boolean,
	scenarioName: string,
): string {
	if (!entries.length) return 'No forecast to read yet.';
	const summary = computeForecastSummary(entries, balanceFlags, useMainBalance);
	if (!summary.lowest) return 'No dated balances in this scenario.';

	const cause = entries[summary.lowest.rowIndex];
	const blocks: string[] = [];
	const heading = scenarioName ? `${scenarioName} — ` : '';

	if (cause?.date) {
		const kind =
			cause.type === 'C' ? 'credit' : cause.type === 'D' ? 'debit' : 'balance reset';
		const amount = moneyAmount(cause);
		const named = amount === null ? displayName(cause.desc) : `${displayName(cause.desc)} (${kind} ${fmt.curr(amount)})`;
		blocks.push(
			`Tight: ${heading}after ${named} on ${fmt.date(cause.date)}, you're at ${fmt.curr(summary.lowest.balance)}. That's the lowest point in this window, ${vsThreshold(summary.lowest.balance, balanceFlags.below.uncomfortable, 'uncomfortable')}.`,
		);
	} else {
		blocks.push(
			`Tight: ${heading}lowest is ${fmt.curr(summary.lowest.balance)} on ${fmt.date(summary.lowest.date)}, ${vsThreshold(summary.lowest.balance, balanceFlags.below.uncomfortable, 'uncomfortable')}.`,
		);
	}

	let watch: string;
	if (summary.firstNegative) {
		const hit = entries[summary.firstNegative.rowIndex];
		watch = `Watch: Crosses zero on ${fmt.date(summary.firstNegative.date)}${hit ? ` after ${displayName(hit.desc)}` : ''}, to ${fmt.curr(summary.firstNegative.balance)}.`;
	} else if (summary.firstUncomfortable) {
		const hit = entries[summary.firstUncomfortable.rowIndex];
		watch = `Watch: First under uncomfortable on ${fmt.date(summary.firstUncomfortable.date)}${hit ? ` after ${displayName(hit.desc)}` : ''}, to ${fmt.curr(summary.firstUncomfortable.balance)}.`;
	} else {
		watch = 'Watch: Stays above the uncomfortable line for the whole window.';
	}
	const next = nextMoneyAfter(entries, summary.lowest.rowIndex, useMainBalance);
	if (next) {
		watch += ` Next after the low: ${formatMoneyLine(next, useMainBalance)}.`;
	}
	blocks.push(watch);

	const tryLines = [
		'Try: A what-if on Entries — then check Forecast for the new lowest.',
	];
	if (cause?.type === 'D') {
		tryLines.push(`Prefix the ${displayName(cause.desc)} line with ! to see the week without it.`);
	}
	if (cause?.date) {
		const need = Math.max(
			100,
			Math.ceil(Math.max(0, balanceFlags.below.uncomfortable - summary.lowest.balance) + 100),
		);
		tryLines.push('Or add a credit the day before the low:');
		tryLines.push(
			`C|${localIsoDate(dayBefore(cause.date))}|${need}|Buffer before ${displayName(cause.desc)}`,
		);
	}
	blocks.push(tryLines.join('\n'));

	return blocks.join('\n\n');
}
