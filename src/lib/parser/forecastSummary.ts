import type { BalanceFlags, ParsedEntry } from './types';

export interface SummaryPoint {
	balance: number;
	date: Date;
	rowIndex: number;
}

export interface ForecastSummary {
	lowest: SummaryPoint | null;
	firstUncomfortable: SummaryPoint | null;
	firstLow: SummaryPoint | null;
	firstNegative: SummaryPoint | null;
	daysBelowUncomfortable: number;
	daysBelowLow: number;
	daysBelowZero: number;
}

function effectiveBalance(entry: ParsedEntry, useMainBalance: boolean): number | undefined {
	if (useMainBalance) {
		return entry.mainBalance;
	}
	if (entry.subAccountRunningBal !== undefined) {
		return entry.subAccountRunningBal;
	}
	return entry.balance ?? entry.mainBalance;
}

function dateKey(date: Date): string {
	return date.toISOString().slice(0, 10);
}

/** Last effective balance per calendar day (in entry order). */
function balancesByDay(entries: ParsedEntry[], useMainBalance: boolean): Map<string, number> {
	const byDay = new Map<string, number>();
	for (const entry of entries) {
		if (!entry.date) continue;
		const bal = effectiveBalance(entry, useMainBalance);
		if (bal === undefined) continue;
		byDay.set(dateKey(entry.date), bal);
	}
	return byDay;
}

function countDaysBelow(byDay: Map<string, number>, threshold: number): number {
	let count = 0;
	for (const bal of byDay.values()) {
		if (bal < threshold) count++;
	}
	return count;
}

function firstCrossingBelow(
	entries: ParsedEntry[],
	threshold: number,
	useMainBalance: boolean,
): SummaryPoint | null {
	let previous: number | undefined;
	for (let rowIndex = 0; rowIndex < entries.length; rowIndex++) {
		const entry = entries[rowIndex];
		if (!entry.date) continue;
		const current = effectiveBalance(entry, useMainBalance);
		if (current === undefined) continue;
		if (previous !== undefined && previous >= threshold && current < threshold) {
			return { balance: current, date: entry.date, rowIndex };
		}
		if (previous === undefined && current < threshold) {
			return { balance: current, date: entry.date, rowIndex };
		}
		previous = current;
	}
	return null;
}

export function computeForecastSummary(
	entries: ParsedEntry[],
	balanceFlags: BalanceFlags,
	useMainBalance = true,
): ForecastSummary {
	if (!entries.length) {
		return {
			lowest: null,
			firstUncomfortable: null,
			firstLow: null,
			firstNegative: null,
			daysBelowUncomfortable: 0,
			daysBelowLow: 0,
			daysBelowZero: 0,
		};
	}

	let lowest: SummaryPoint | null = null;

	for (let rowIndex = 0; rowIndex < entries.length; rowIndex++) {
		const entry = entries[rowIndex];
		if (!entry.date) continue;
		const balance = effectiveBalance(entry, useMainBalance);
		if (balance === undefined) continue;
		if (!lowest || balance < lowest.balance) {
			lowest = { balance, date: entry.date, rowIndex };
		}
	}

	const byDay = balancesByDay(entries, useMainBalance);

	return {
		lowest,
		firstUncomfortable: firstCrossingBelow(
			entries,
			balanceFlags.below.uncomfortable,
			useMainBalance,
		),
		firstLow: firstCrossingBelow(entries, balanceFlags.below.low, useMainBalance),
		firstNegative: firstCrossingBelow(entries, balanceFlags.below.negative, useMainBalance),
		daysBelowUncomfortable: countDaysBelow(byDay, balanceFlags.below.uncomfortable),
		daysBelowLow: countDaysBelow(byDay, balanceFlags.below.low),
		daysBelowZero: countDaysBelow(byDay, balanceFlags.below.negative),
	};
}
