import dayjs from 'dayjs';
import { fmt } from '$lib/formatters/fmt';
import { applyBusinessDayShift } from '$lib/parser/businessDays';
import {
	applyOverrideToEntry,
	splitLineFields,
} from '$lib/parser/occurrenceEdit';
import {
	dayKey,
	getBalanceFlag,
	getRandomId,
	parseDate,
	sortEntries,
	updateDateRecur,
	updateDescRecur,
} from '$lib/parser/recurrence';
import { parseAccountDisplay } from '$lib/parser/accountLabel';
import { parseLineExtras, resolvePayment } from '$lib/parser/lineExtras';
import { isEntryLineDisabled } from '$lib/parser/validateEntries';
import type {
	Account,
	AccountEntries,
	Accounts,
	BalanceFlags,
	ParsedEntry,
	ParseOptions,
	ParseResult,
} from '$lib/parser/types';

function applyAccountDisplay(account: Account, desc: string | null | undefined): void {
	const display = parseAccountDisplay(desc, account.id);
	if (!account.name || account.name === account.id) {
		account.name = display.name;
	}
	if (!account.lastFour && display.lastFour) {
		account.lastFour = display.lastFour;
	}
}

function shiftEntryDate(
	entry: ParsedEntry,
	useFederalHolidays: boolean,
): void {
	if (entry.date && entry.businessDayShift) {
		entry.date = applyBusinessDayShift(entry.date, entry.businessDayShift, useFederalHolidays);
	}
}

function parseRawEntries(
	rawEntries: string,
	recurringEntries: Record<string, number>,
	useFederalHolidays: boolean,
) {
	const accounts: Accounts = {};
	const parsedEntries = rawEntries
		.trim()
		.split('\n')
		.map((rawEntry, lineIndex) => {
			if (!rawEntry || rawEntry.length === 0) {
				return undefined;
			}
			if (isEntryLineDisabled(rawEntry)) {
				return undefined;
			}
			if (rawEntry.startsWith('---')) {
				return {
					id: getRandomId(),
					type: 'G' as const,
					group: rawEntry.replace('--- ', ''),
					endDate: null,
					date: null,
					amount: '',
					desc: null,
					rawEntry,
					accountId: undefined,
					isMain: false,
					recur: null,
				};
			}
			const { extras, overrides } = splitLineFields(rawEntry);
			const lineExtras = parseLineExtras(extras);
			const entry = rawEntry.split('|');
			const [type, accountId, main] = entry[0].toUpperCase().split('-');
			const parsedEntry: ParsedEntry = {
				id: getRandomId(),
				date: null,
				type: type as ParsedEntry['type'],
				amount: entry[2],
				desc: entry[3],
				accountId: accountId && accountId.length > 0 ? accountId : extras[0] || undefined,
				endDate: null,
				rawEntry,
				isMain: false,
				recur: null,
				entryOrder: lineIndex,
				occurrenceIndex: 1,
				overrides,
				strategy: lineExtras.strategy,
				minRate: lineExtras.minRate,
				payUrl: lineExtras.payUrl,
				notes: lineExtras.notes,
				categoryId: lineExtras.categoryId,
				autopay: lineExtras.autopay,
			};
			if (parsedEntry.type === 'B' && parsedEntry.accountId) {
				parsedEntry.isMain = main === 'MAIN';
				accounts[parsedEntry.accountId] = {
					id: parsedEntry.accountId,
					isMain: parsedEntry.isMain,
					startingBal: +parsedEntry.amount,
					runningBal: +parsedEntry.amount,
				};
				applyAccountDisplay(accounts[parsedEntry.accountId], parsedEntry.desc);
			} else if (parsedEntry.accountId) {
				parsedEntry.accountId = parsedEntry.accountId.toUpperCase();
				const existing = accounts[parsedEntry.accountId];
				if (!existing) {
					accounts[parsedEntry.accountId] = {
						id: parsedEntry.accountId,
						isMain: false,
						startingBal: lineExtras.startingBal ?? 0,
						runningBal: lineExtras.startingBal ?? 0,
						interestRate: lineExtras.apr ?? 0,
						interestRate2: lineExtras.apr2 ?? 0,
						interestRate2Date: lineExtras.apr2Date ?? null,
						strategy: lineExtras.strategy,
						minRate: lineExtras.minRate,
						payUrl: lineExtras.payUrl,
						notes: lineExtras.notes,
						categoryId: lineExtras.categoryId,
						autopay: lineExtras.autopay,
					};
				} else if (existing.startingBal <= 0 && (lineExtras.startingBal ?? 0) > 0) {
					existing.startingBal = lineExtras.startingBal ?? 0;
					existing.runningBal = lineExtras.startingBal ?? 0;
					if ((lineExtras.apr ?? 0) > 0) existing.interestRate = lineExtras.apr;
				}
				applyAccountDisplay(accounts[parsedEntry.accountId], parsedEntry.desc);
			}
			const when = parseDate(entry[1]);
			if (when) {
				parsedEntry.date = when.startDate;
				parsedEntry.recur = when.recur;
				parsedEntry.rawRecur = when.recurRaw;
				parsedEntry.endDate = when.endDate;
				parsedEntry.businessDayShift = when.businessDayShift;
				shiftEntryDate(parsedEntry, useFederalHolidays);
				parsedEntry.seriesDate = parsedEntry.date;
			}
			parsedEntry.baseAmount = +parsedEntry.amount;
			applyOverrideToEntry(parsedEntry, overrides[1]);
			if (!recurringEntries[parsedEntry.id]) {
				recurringEntries[parsedEntry.id] = 1;
			}
			if (parsedEntry.recur !== null && parsedEntry.desc) {
				parsedEntry.desc = updateDescRecur(
					parsedEntry.desc,
					parsedEntry.recur,
					recurringEntries[parsedEntry.id],
				);
			}
			return parsedEntry;
		})
		.filter((entry): entry is ParsedEntry => entry !== undefined && entry.type !== 'G');

	return { accounts, parsedEntries };
}

export { applyForecastEdit } from '$lib/parser/occurrenceEdit';

export function parseEntries(
	rawEntries: string,
	monthsToForecast: number,
	balanceFlags: BalanceFlags,
	options: ParseOptions = {},
): ParseResult {
	const useFederalHolidays = options.useFederalHolidays ?? true;
	const balanceIncludesSameDay = options.balanceIncludesSameDay ?? true;
	const recurringEntries: Record<string, number> = {};
	const { accounts, parsedEntries } = parseRawEntries(
		rawEntries,
		recurringEntries,
		useFederalHolidays,
	);

	if (typeof parsedEntries[0]?.date !== 'object') {
		console.error('error parsing the date.', parsedEntries);
		return [null, null];
	}

	const balanceDate = parsedEntries.filter((entry) => entry.type === 'B')[0]?.date;
	if (!balanceDate) {
		console.error('error parsing balance date.', parsedEntries);
		return [null, null];
	}

	const endDate = dayjs(balanceDate)
		.add(Math.max(monthsToForecast, 1) - 1, 'month')
		.endOf('month')
		.toDate();
	const mainAccount = Object.values(accounts).find((account) => account.isMain);
	if (!mainAccount) {
		console.error('main account not found.', accounts);
		return [null, null];
	}

	sortEntries(parsedEntries);

	// Days with a main-account B line. When the setting is on, same-day C/D on those
	// days are treated as already reflected in that balance.
	const balanceDays = new Set<number>();
	if (balanceIncludesSameDay) {
		for (const entry of parsedEntries) {
			if (entry.type === 'B' && entry.date && entry.accountId === mainAccount.id) {
				balanceDays.add(dayKey(entry.date));
			}
		}
	}
	const isBalanceDay = (entry: ParsedEntry): boolean =>
		balanceDays.size > 0 &&
		entry.type !== 'B' &&
		entry.date !== null &&
		balanceDays.has(dayKey(entry.date));
	const isInBalance = (entry: ParsedEntry): boolean => isBalanceDay(entry) && !entry.pending;

	const tableEntries: ParsedEntry[] = [];
	const queue = [...parsedEntries];

	while (queue.length > 0) {
		const entry = queue.shift();
		if (!entry) continue;

		entry.inBalanceEligible = isBalanceDay(entry);
		entry.inBalance = isInBalance(entry);
		tableEntries.push(entry);

		if (entry.recur && entry.seriesDate) {
			const newEntry: ParsedEntry = { ...entry };
			++recurringEntries[newEntry.id];
			newEntry.occurrenceIndex = recurringEntries[newEntry.id];
			newEntry.date = updateDateRecur(entry.seriesDate, newEntry.recur);
			shiftEntryDate(newEntry, useFederalHolidays);
			newEntry.seriesDate = newEntry.date;
			newEntry.amount = newEntry.baseAmount ?? +entry.amount;
			applyOverrideToEntry(newEntry, newEntry.overrides?.[newEntry.occurrenceIndex]);
			if (newEntry.desc) {
				newEntry.desc = updateDescRecur(newEntry.desc, newEntry.recur, recurringEntries[newEntry.id]);
			}
			if (
				newEntry.date <= (newEntry.endDate === null ? endDate : newEntry.endDate) &&
				newEntry.recur &&
				(newEntry.recur.count === null ||
					recurringEntries[newEntry.id] <= (newEntry.recur.count ?? 0))
			) {
				queue.push(newEntry);
			}
		}

		if (entry.accountId && entry.accountId !== mainAccount.id && !entry.inBalance) {
			const entryAccount = accounts[entry.accountId];
			if (entryAccount && entryAccount.startingBal > 0) {
				if (entryAccount.runningBal > 0) {
					if (entry.strategy === 'min' || entry.strategy === 'pct') {
						entry.amount = resolvePayment(
							entry.strategy,
							+(entry.baseAmount ?? entry.amount),
							entryAccount.runningBal,
							entry.minRate,
						);
					}
					let interestRate = +(entryAccount.interestRate ?? 0);
					if ((entryAccount.interestRate2 ?? 0) > 0 && entryAccount.interestRate2Date) {
						const interestRate2Date = new Date(entryAccount.interestRate2Date);
						if (entry.date && entry.date > interestRate2Date) {
							interestRate = +(entryAccount.interestRate2 ?? 0);
						}
					}
					if (interestRate > 0) {
						const interest = (interestRate / 100 / 12) * entryAccount.runningBal;
						const last = tableEntries.at(-1);
						if (last) last.monthlyInterest = +interest;
						entryAccount.runningBal += interest;
					}
					if (entryAccount.runningBal <= +entry.amount && entryAccount.runningBal > 1) {
						entry.amount = entryAccount.runningBal;
						entry.flag = 'paid-off';
					}
					entryAccount.runningBal += entry.type === 'C' ? +entry.amount : -entry.amount;
					const last = tableEntries.at(-1);
					if (last) last.subAccountRunningBal = entryAccount.runningBal;
				} else {
					const last = tableEntries.at(-1);
					if (last) last.subAccountRunningBal = 0;
					entry.amount = 0;
					entry.flag = 'paid-off';
				}
			}
		}
	}

	const sortedTableEntries = sortEntries(tableEntries);
	const accountEntries: AccountEntries = {};
	accountEntries[mainAccount.id] = [];

	for (const entry of sortedTableEntries) {
		const account: Account =
			entry.accountId === undefined ? mainAccount : accounts[entry.accountId!];
		if (!accountEntries[account.id]) {
			accountEntries[account.id] = [];
		}
		if (entry.inBalance) {
			// Already counted in the same-day B amount; leave the running balance alone.
		} else if (entry.type === 'C') {
			mainAccount.runningBal += +entry.amount;
		} else if (entry.type === 'D') {
			mainAccount.runningBal -= +entry.amount;
		} else if (entry.type === 'B') {
			mainAccount.runningBal = +entry.amount;
			mainAccount.balanceIndex = accountEntries[account.id].length;
		}
		entry.accountId = account.id;
		entry.balance = +account.runningBal;
		entry.mainBalance = +mainAccount.runningBal;
		entry.formattedDate = fmt.date(entry.date);
		entry.formattedCredit = entry.type === 'C' ? fmt.curr(entry.amount) : '';
		entry.formattedDebit = entry.type === 'D' ? fmt.curr(entry.amount) : '';
		entry.formattedBalance = fmt.curr(entry.balance);
		entry.flag = (entry.flag ?? getBalanceFlag(entry.mainBalance!, balanceFlags)) as ParsedEntry['flag'];
		accountEntries[mainAccount.id].push(entry);
		if (mainAccount.id !== account.id) {
			accountEntries[account.id].push(entry);
		}
	}

	for (const [accountId, entries] of Object.entries(accountEntries)) {
		const balanceIndex = accounts[accountId]?.balanceIndex ?? 0;
		accountEntries[accountId] = entries.slice(balanceIndex);
	}

	return [accountEntries, accounts];
}
