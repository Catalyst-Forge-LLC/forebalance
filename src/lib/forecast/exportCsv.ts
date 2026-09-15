import { localIsoDate } from '$lib/formatters/dates';
import { fmt } from '$lib/formatters/fmt';
import { accountDisplayName } from '$lib/parser/accountLabel';
import { computeForecastSummary, type ForecastSummary } from '$lib/parser/forecastSummary';
import type { Account, Accounts, BalanceFlags, ParsedEntry } from '$lib/parser/types';

export const FORECAST_CSV_HEADERS = [
	'date',
	'type',
	'description',
	'credit',
	'debit',
	'balance',
	'flag',
	'in_balance',
	'pending',
	'account',
	'occurrence',
] as const;

export function csvEscape(value: string | number | boolean | null | undefined): string {
	const s = value == null ? '' : String(value);
	if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
	return s;
}

export function fileSlug(name: string): string {
	return name.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'forecast';
}

function yesNo(value: boolean | undefined): string {
	return value ? 'yes' : '';
}

function amountCell(entry: ParsedEntry, want: 'C' | 'D'): string {
	if (entry.type !== want) return '';
	return String(+entry.amount);
}

function rowBalance(entry: ParsedEntry, useMainBalance: boolean): string {
	const bal = useMainBalance
		? entry.mainBalance
		: (entry.subAccountRunningBal ?? entry.balance ?? entry.mainBalance);
	return bal === undefined ? '' : String(bal);
}

function accountName(entry: ParsedEntry, accounts: Accounts): string {
	const account = entry.accountId ? accounts[entry.accountId] : undefined;
	if (account) return accountDisplayName(account);
	return entry.accountId ?? '';
}

export function forecastEntryCsvRow(
	entry: ParsedEntry,
	accounts: Accounts,
	useMainBalance: boolean,
): string[] {
	return [
		entry.date ? localIsoDate(entry.date) : '',
		entry.type,
		entry.desc ?? '',
		amountCell(entry, 'C'),
		amountCell(entry, 'D'),
		rowBalance(entry, useMainBalance),
		entry.flag ?? '',
		yesNo(entry.inBalance),
		yesNo(entry.pending && entry.inBalanceEligible),
		accountName(entry, accounts),
		entry.occurrenceIndex != null ? String(entry.occurrenceIndex) : '',
	];
}

export function forecastEntriesToCsv(
	entries: ParsedEntry[],
	accounts: Accounts,
	useMainBalance = true,
): string {
	const lines = [
		FORECAST_CSV_HEADERS.join(','),
		...entries.map((entry) =>
			forecastEntryCsvRow(entry, accounts, useMainBalance).map(csvEscape).join(','),
		),
	];
	return `\uFEFF${lines.join('\n')}\n`;
}

export function formatSummaryPoint(
	label: string,
	point: ForecastSummary['lowest'],
): string | null {
	if (!point) return null;
	return `${label} ${fmt.curr(point.balance)} on ${fmt.date(point.date)}`;
}

export function forecastSummaryText(
	entries: ParsedEntry[],
	balanceFlags: BalanceFlags,
	opts: { scenarioName: string; accountLabel: string; useMainBalance: boolean },
): string {
	const summary = computeForecastSummary(entries, balanceFlags, opts.useMainBalance);
	const lines = [
		`ForeBalance forecast — ${opts.scenarioName}`,
		opts.accountLabel,
		formatSummaryPoint('Lowest', summary.lowest),
		formatSummaryPoint('Uncomfortable', summary.firstUncomfortable),
		formatSummaryPoint('Low', summary.firstLow),
		formatSummaryPoint('Negative', summary.firstNegative),
		summary.daysBelowUncomfortable > 0
			? `${summary.daysBelowUncomfortable} days below uncomfortable`
			: 'Above uncomfortable the whole window',
	].filter((line): line is string => !!line);
	return `${lines.join('\n')}\n`;
}

export function forecastFilename(scenarioName: string, accountLabel: string): string {
	const day = localIsoDate();
	const account = fileSlug(accountLabel);
	return `forebalance-${fileSlug(scenarioName)}-${account}-${day}.csv`;
}

export function flattenAccountTables(
	accountList: Account[],
	accountEntries: Record<string, ParsedEntry[]>,
): { entries: ParsedEntry[]; useMainBalance: boolean }[] {
	return accountList
		.filter((account) => accountEntries[account.id]?.length)
		.map((account) => ({
			entries: accountEntries[account.id],
			useMainBalance: account.isMain,
		}));
}

export function forecastAllAccountsToCsv(
	accountList: Account[],
	accountEntries: Record<string, ParsedEntry[]>,
	accounts: Accounts,
): string {
	const rows: string[] = [FORECAST_CSV_HEADERS.join(',')];
	for (const slice of flattenAccountTables(accountList, accountEntries)) {
		for (const entry of slice.entries) {
			rows.push(
				forecastEntryCsvRow(entry, accounts, slice.useMainBalance).map(csvEscape).join(','),
			);
		}
	}
	return `\uFEFF${rows.join('\n')}\n`;
}
