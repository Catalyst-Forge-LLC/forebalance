import { fmt } from './fmt';
import { getBalanceFlag, getRandomId, logd, parseDate, sortEntries, updateDateRecur, updateDescRecur } from './util';

const recurringEntries = {};

/**
 * Updates an entry in the raw entries string by replacing the specified parsed entry's values
 * with the provided entry inputs.
 *
 * @param {string} rawEntries - The raw entries string, where each entry is separated by a newline.
 * @param {Object} parsedEntry - The parsed entry object to be updated.
 * @param {string} parsedEntry.rawEntry - The raw string representation of the entry.
 * @param {string} parsedEntry.desc - The description of the entry.
 * @param {number} parsedEntry.amount - The amount associated with the entry.
 * @param {string} parsedEntry.date - The date of the entry in a specific format.
 * @param {string} parsedEntry.type - The type/category of the entry.
 * @param {Object} entryInputs - The new input values to update the entry with.
 * @param {string} entryInputs.desc - The new description for the entry.
 * @param {number} entryInputs.amount - The new amount for the entry.
 * @param {string} entryInputs.date - The new date for the entry in a specific format.
 * @param {string} entryInputs.type - The new type/category for the entry.
 * @returns {string} - The updated raw entries string with the specified entry modified.
 */
export let updateEntry = (rawEntries, parsedEntry, entryInputs) => {
  rawEntries
    .trim()
    .split('\n')
    .filter((entry) => entry === parsedEntry.rawEntry.trim())
    .forEach((entry) => {
      let valueSets = [
        ['|' + parsedEntry.desc, '|' + entryInputs.desc],
        ['|' + +parsedEntry.amount, '|' + entryInputs.amount],
        ['|' + fmt.date3(parsedEntry.date), '|' + entryInputs.date],
        [parsedEntry.type + '|', entryInputs.type + '|'],
      ];
      valueSets.forEach(([value, input]) => {
        logd(value, input, entryInputs, entry);
        if (value !== input) {
          rawEntries = rawEntries.replace(entry, entry.replace(value, input));
        }
      });
    });
  return rawEntries;
};

let parseRawEntries = (rawEntries) => {
  let accounts = {};
  let parsedEntries = rawEntries
    .trim()
    .split('\n')
    .map((rawEntry) => {
      if (rawEntry && rawEntry.length > 0) {
        if (rawEntry.startsWith('---')) {
          // this is a group entry
          return {
            id: getRandomId(),
            type: 'G',
            group: rawEntry.replace('--- ', ''),
            endDate: null,
            date: null,
            amount: null,
            desc: null,
            rawEntry,
            account: null,
            isMain: false,
            recur: null,
          };
        }
        const entry = rawEntry.split('|');
        let [type, account, main] = entry[0].toUpperCase().split('-');
        let parsedEntry = {
          id: getRandomId(),
          date: null,
          type,
          amount: entry[2],
          desc: entry[3],
          endDate: null,
          rawEntry,
          account: undefined,
          isMain: false,
          recur: null,
        };
        if (account && account.length > 0) {
          parsedEntry.account = account;
        }
        if (parsedEntry.type === 'B' && parsedEntry.account) {
          parsedEntry.isMain = main === 'MAIN';
          accounts[parsedEntry.account] = {
            id: parsedEntry.account,
            isMain: parsedEntry.isMain,
            startBal: +parsedEntry.amount,
            runningBal: +parsedEntry.amount,
          };
        }
        [parsedEntry.date, parsedEntry.recur, parsedEntry.rawRecur, parsedEntry.endDate] = parseDate(entry[1]);
        if (!recurringEntries[parsedEntry.id]) {
          recurringEntries[parsedEntry.id] = 1;
        }
        if (parsedEntry.recur !== null) {
          parsedEntry.desc = updateDescRecur(parsedEntry.desc, parsedEntry.recur, recurringEntries[parsedEntry.id]);
        }
        return parsedEntry;
      }
    })
    .filter((entry) => entry?.type !== 'G');
  return { accounts, parsedEntries };
};

/**
 * Parses raw financial entries and generates structured account and transaction data.
 *
 * @param {string} rawEntries - The raw input string containing financial entries, separated by newlines.
 * @param {number} monthsToForecast - The number of months to forecast for recurring entries.
 * @param {Object} balanceFlags - An object containing balance flag thresholds for categorizing balances.
 * @returns {[null | Object, null | Object]} - A tuple containing:
 *   - accountEntries: An object where keys are account IDs and values are arrays of parsed entries for each account.
 *   - accounts: An object where keys are account IDs and values are account details (e.g., starting balance, running balance).
 *
 * @throws {Error} If the date parsing fails for the first entry.
 *
 * @example
 * const rawEntries = `
 * B-ACC1-MAIN|2023-01-01|1000|Starting balance
 * C-ACC1|2023-01-05|200|Salary
 * D-ACC1|2023-01-10|50|Groceries
 * `;
 * const monthsToForecast = 12;
 * const balanceFlags = { low: 500, high: 2000 };
 * const [accountEntries, accounts] = parseEntries(rawEntries, monthsToForecast, balanceFlags);
 */
export let parseEntries = (rawEntries, monthsToForecast, balanceFlags) => {
  let { accounts, parsedEntries } = parseRawEntries(rawEntries);

  if (typeof parsedEntries[0]?.date !== 'object') {
    console.error('error parsing the date.', parsedEntries);
    return [null, null];
  }

  const balanceDate = parsedEntries.filter((entry) => entry?.type === 'B')[0]?.date;
  const endDate = dayjs(balanceDate).add(monthsToForecast, 'month').endOf('month').toDate();

  sortEntries(parsedEntries);

  const tableEntries = [];

  while (parsedEntries.length > 0) {
    parsedEntries.forEach((entry, i) => {
      tableEntries.push(entry);
      if (entry?.recur) {
        let newEntry = { ...entry };
        ++recurringEntries[newEntry.id];
        newEntry.date = updateDateRecur(newEntry.date, newEntry.recur);
        newEntry.desc = updateDescRecur(newEntry.desc, newEntry.recur, recurringEntries[newEntry.id]);
        if (
          newEntry.date &&
          newEntry.date <= (newEntry.endDate === null ? endDate : newEntry.endDate) &&
          newEntry.recur &&
          (newEntry.recur.count === null || (newEntry.recur.count !== null && recurringEntries[newEntry.id] <= newEntry.recur.count))
        ) {
          parsedEntries.push(newEntry);
        }
      }
      parsedEntries.splice(i, 1);
    });
  }

  sortEntries(tableEntries);

  let defaultAccount = Object.values(accounts).filter((account) => account.isMain)[0];
  logd('[tableEntries]', { tableEntries, accounts, defaultAccount });

  const accountEntries = {};

  tableEntries.forEach((entry, i) => {
    const account = entry.account === undefined ? defaultAccount : accounts[entry.account];
    if (!accountEntries[account?.id]) {
      accountEntries[account?.id] = [];
    }
    if (entry.type === 'C') {
      account.runningBalance += +entry.amount;
    } else if (entry.type === 'D') {
      account.runningBalance -= +entry.amount;
    } else if (entry.type === 'B') {
      account.runningBalance = +entry.amount;
      account.balanceIndex = accountEntries[account.id].length;
    }
    entry.account = account.id;
    entry.balance = +account.runningBalance;
    entry.formattedDate = fmt.date(entry.date);
    entry.formattedCredit = entry.type === 'C' ? fmt.curr(entry.amount) : '';
    entry.formattedDebit = entry.type === 'D' ? fmt.curr(entry.amount) : '';
    entry.formattedBalance = fmt.curr(entry.balance);
    entry.flag = getBalanceFlag(entry.balance, balanceFlags);
    accountEntries[account.id].push(entry);
  });
  Object.entries(accountEntries).forEach(([accountId, entries]) => {
    logd('[account-entries]', accountId, entries.length, accounts[accountId].balanceIndex);
    accountEntries[accountId].splice(0, accounts[accountId].balanceIndex);
  });
  logd('[accounts]', { accountEntries, accounts });
  // tableEntries.splice(0, balanceIndex);
  return [accountEntries, accounts];
};
