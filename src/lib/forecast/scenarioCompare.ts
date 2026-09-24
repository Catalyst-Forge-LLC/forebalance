import dayjs from 'dayjs';
import { accountDisplayName } from '$lib/parser/accountLabel';
import { debtOutlook } from '$lib/parser/debtOutlook';
import { parseEntries } from '$lib/parser/parseEntries';
import { computeForecastSummary } from '$lib/parser/forecastSummary';
import type { Account, AccountEntries, BalanceFlags, ParseOptions } from '$lib/parser/types';

export interface MonthBalance {
	month: string;
	balance: number | null;
}

export interface DebtCompare {
	id: string;
	name: string;
	remaining: number | null;
	payoff: Date | null;
	beyond: boolean;
}

export interface ScenarioSnapshot {
	endingBalance: number | null;
	lowestBalance: number | null;
	lowestDate: Date | null;
	months: MonthBalance[];
	debts: DebtCompare[];
}

export interface LineChange {
	kind: 'added' | 'removed' | 'changed';
	before?: string;
	after?: string;
}

export function diffScenarioLines(left: string, right: string): LineChange[] {
	const a = left.split('\n').map((line) => line.trim()).filter(Boolean);
	const b = right.split('\n').map((line) => line.trim()).filter(Boolean);
	const changes: LineChange[] = [];
	const length = Math.max(a.length, b.length);
	for (let index = 0; index < length; index += 1) {
		if (a[index] === b[index]) continue;
		if (a[index] === undefined) changes.push({ kind: 'added', after: b[index] });
		else if (b[index] === undefined) changes.push({ kind: 'removed', before: a[index] });
		else changes.push({ kind: 'changed', before: a[index], after: b[index] });
	}
	return changes;
}

function monthKey(date: Date): string {
	return dayjs(date).format('YYYY-MM');
}

function snapshot(
	entries: AccountEntries,
	accounts: Record<string, Account>,
	asOf: Date,
	flags: BalanceFlags,
): ScenarioSnapshot {
	const main = Object.values(accounts).find((account) => account.isMain);
	const mainRows = main ? entries[main.id] ?? [] : [];
	const summary = computeForecastSummary(mainRows, flags, true);
	const byMonth = new Map<string, number>();
	for (const entry of mainRows) {
		if (!entry.date || entry.mainBalance === undefined) continue;
		byMonth.set(monthKey(entry.date), entry.mainBalance);
	}
	const debts: DebtCompare[] = Object.values(accounts)
		.filter((account) => !account.isMain)
		.map((account) => {
			const outlook = debtOutlook(entries[account.id] ?? [], asOf);
			return {
				id: account.id,
				name: accountDisplayName(account),
				remaining: account.runningBal,
				payoff: outlook?.payoffDate ?? null,
				beyond: outlook?.beyondWindow ?? account.runningBal > 1,
			};
		});
	const last = mainRows[mainRows.length - 1];
	return {
		endingBalance: last?.mainBalance ?? null,
		lowestBalance: summary.lowest?.balance ?? null,
		lowestDate: summary.lowest?.date ?? null,
		months: [...byMonth.entries()].map(([month, balance]) => ({ month, balance })),
		debts,
	};
}

export function compareScenarios(
	leftRaw: string,
	rightRaw: string,
	monthsToForecast: number,
	flags: BalanceFlags,
	options: ParseOptions = {},
	asOf = new Date(),
): { left: ScenarioSnapshot | null; right: ScenarioSnapshot | null; lines: LineChange[] } {
	const parse = (raw: string) => parseEntries(raw, monthsToForecast, flags, options);
	const [leftEntries, leftAccounts] = parse(leftRaw);
	const [rightEntries, rightAccounts] = parse(rightRaw);
	return {
		left: leftEntries && leftAccounts ? snapshot(leftEntries, leftAccounts, asOf, flags) : null,
		right: rightEntries && rightAccounts ? snapshot(rightEntries, rightAccounts, asOf, flags) : null,
		lines: diffScenarioLines(leftRaw, rightRaw),
	};
}
