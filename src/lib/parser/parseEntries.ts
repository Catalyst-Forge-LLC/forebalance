import dayjs from 'dayjs';
import { fmt } from '$lib/formatters/fmt';
import {
	getBalanceFlag,
	getRandomId,
	parseDate,
	sortEntries,
	updateDateRecur,
	updateDescRecur,
} from '$lib/parser/recurrence';
import { isEntryLineDisabled } from '$lib/parser/validateEntries';
import type {
	Account,
	AccountEntries,
	Accounts,
	BalanceFlags,
	EntryInputs,
	ParsedEntry,
	ParseResult,
} from '$lib/parser/types';

function parseRawEntries(rawEntries: string, recurringEntries: Record<string, number>) {
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
			const entry = rawEntry.split('|');
			const [type, accountId, main] = entry[0].toUpperCase().split('-');
			const parsedEntry: ParsedEntry = {
				id: getRandomId(),
				date: null,
				type: type as ParsedEntry['type'],
				amount: entry[2],
				desc: entry[3],
				accountId: accountId && accountId.length > 0 ? accountId : entry[4] || undefined,
				endDate: null,
				rawEntry,
				isMain: false,
				recur: null,
				entryOrder: lineIndex,
			};
			if (parsedEntry.type === 'B' && parsedEntry.accountId) {
				parsedEntry.isMain = main === 'MAIN';
				accounts[parsedEntry.accountId] = {
					id: parsedEntry.accountId,
					isMain: parsedEntry.isMain,
					startingBal: +parsedEntry.amount,
					runningBal: +parsedEntry.amount,
				};
			} else if (parsedEntry.accountId) {
				parsedEntry.accountId = parsedEntry.accountId.toUpperCase();
				if (!accounts[parsedEntry.accountId]) {
					accounts[parsedEntry.accountId] = {
						id: parsedEntry.accountId,
						isMain: false,
						startingBal: +entry[5],
						runningBal: +entry[5],
						interestRate: +entry[6] || 0,
						interestRate2: +entry[7] || 0,
						interestRate2Date: entry[8] || null,
					};
				}
			}
			const dateParts = parseDate(entry[1]);
			if (dateParts) {
				[parsedEntry.date, parsedEntry.recur, parsedEntry.rawRecur, parsedEntry.endDate] =
					dateParts as [Date, ParsedEntry['recur'], string, Date | null];
			}
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

export function updateEntry(
	rawEntries: string,
	parsedEntry: ParsedEntry,
	entryInputs: EntryInputs,
): string {
	let updated = rawEntries;
	updated
		.trim()
		.split('\n')
		.filter((entry) => entry === parsedEntry.rawEntry.trim())
		.forEach((entry) => {
			const valueSets: [string, string][] = [
				['|' + parsedEntry.desc, '|' + entryInputs.desc],
				['|' + +parsedEntry.amount, '|' + String(entryInputs.amount)],
				['|' + fmt.date3(parsedEntry.date), '|' + entryInputs.date],
				[parsedEntry.type + '|', entryInputs.type + '|'],
			];
			valueSets.forEach(([value, input]) => {
				if (value !== input) {
					updated = updated.replace(entry, entry.replace(value, input));
				}
			});
		});
	return updated;
}

export function parseEntries(
	rawEntries: string,
	monthsToForecast: number,
	balanceFlags: BalanceFlags,
): ParseResult {
	const recurringEntries: Record<string, number> = {};
	const { accounts, parsedEntries } = parseRawEntries(rawEntries, recurringEntries);

	if (typeof parsedEntries[0]?.date !== 'object') {
		console.error('error parsing the date.', parsedEntries);
		return [null, null];
	}

	const balanceDate = parsedEntries.filter((entry) => entry.type === 'B')[0]?.date;
	if (!balanceDate) {
		console.error('error parsing balance date.', parsedEntries);
		return [null, null];
	}

	const endDate = dayjs(balanceDate).add(monthsToForecast, 'month').endOf('month').toDate();
	const mainAccount = Object.values(accounts).find((account) => account.isMain);
	if (!mainAccount) {
		console.error('main account not found.', accounts);
		return [null, null];
	}

	sortEntries(parsedEntries);

	const tableEntries: ParsedEntry[] = [];
	let extraMonthlyPayment = 0;
	const queue = [...parsedEntries];

	while (queue.length > 0) {
		const entry = queue.shift();
		if (!entry) continue;

		tableEntries.push(entry);

		if (entry.recur && entry.date) {
			const newEntry: ParsedEntry = { ...entry };
			++recurringEntries[newEntry.id];
			newEntry.date = updateDateRecur(newEntry.date, newEntry.recur);
			if (newEntry.desc) {
				newEntry.desc = updateDescRecur(newEntry.desc, newEntry.recur, recurringEntries[newEntry.id]);
			}
			if (
				newEntry.date <= (newEntry.endDate === null ? endDate : newEntry.endDate) &&
				newEntry.recur &&
				(newEntry.recur.count === null ||
					recurringEntries[newEntry.id] <= (newEntry.recur.count ?? 0))
			) {
				const entryAccount = newEntry.accountId ? accounts[newEntry.accountId] : undefined;
				if (entryAccount?.extraPayment) {
					newEntry.amount = +newEntry.amount + +entryAccount.extraPayment;
					accounts[newEntry.accountId!] = { ...entryAccount, extraPayment: 0 };
				}
				queue.push(newEntry);
			}
		}

		if (entry.accountId && entry.accountId !== mainAccount.id) {
			const entryAccount = accounts[entry.accountId];
			if (entryAccount && entryAccount.startingBal > 0) {
				if (entryAccount.runningBal > 0) {
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
						extraMonthlyPayment += +entry.amount - +entryAccount.runningBal;
						entry.amount = entryAccount.runningBal;
						entry.flag = 'paid-off';
					}
					entryAccount.runningBal += entry.type === 'C' ? +entry.amount : -entry.amount;
					const last = tableEntries.at(-1);
					if (last) last.subAccountRunningBal = entryAccount.runningBal;

					const extraAmount = 250;
					while (extraMonthlyPayment > extraAmount) {
						for (const account of Object.values(accounts)) {
							if (
								account.runningBal > 0 &&
								(account.interestRate ?? 0) > 0 &&
								extraMonthlyPayment >= extraAmount
							) {
								account.extraPayment = +(account.extraPayment ?? 0) + extraAmount;
								extraMonthlyPayment -= extraAmount;
							}
						}
					}
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

	for (const entry of sortedTableEntries) {
		const account: Account =
			entry.accountId === undefined ? mainAccount : accounts[entry.accountId!];
		if (!accountEntries[account.id]) {
			accountEntries[account.id] = [];
		}
		if (entry.type === 'C') {
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
