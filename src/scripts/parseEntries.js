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
            accountId: null,
            isMain: false,
            recur: null,
          };
        }
        const entry = rawEntry.split('|');
        let [type, accountId, main] = entry[0].toUpperCase().split('-');
        let parsedEntry = {
          id: getRandomId(),
          date: null,
          type,
          amount: entry[2],
          desc: entry[3],
          accountId: accountId && accountId.length > 0 ? accountId : entry[4] || undefined,
          endDate: null,
          rawEntry,
          isMain: false,
          recur: null,
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
            logd('account not found', parsedEntry.accountId, parsedEntry);
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
  let mainAccount = Object.values(accounts).filter((account) => account.isMain)[0];

  sortEntries(parsedEntries);

  const tableEntries = [];
  let extraMonthlyPayment = 0;

  while (parsedEntries.length > 0) {
    // logd('[parsedEntries]', parsedEntries);
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
          const entryAccount = accounts[newEntry.accountId];
          // logd(
          //   `[extra payment 0] ${entryAccount?.id} amount: $${newEntry.amount}, entryDate: ${entry.date}, recurDate: ${newEntry.date}  extraPayment: $${entryAccount?.extraPayment}`,
          // );
          if (entryAccount && entryAccount.extraPayment) {
            logd(`[extra payment 1] ${entryAccount.id} amount: $${newEntry.amount}, entryDate: ${entry.date} extraPayment: $${entryAccount.extraPayment}`);
            newEntry.amount = +newEntry.amount + +entryAccount.extraPayment;
            accounts[newEntry.accountId] = { ...entryAccount, extraPayment: 0 };
            logd(`[extra payment 1b] ${entryAccount.id} amount: $${newEntry.amount}, recurDate: ${newEntry.date} extraPayment: $${entryAccount.extraPayment}`);
          }
          parsedEntries.push(newEntry);
        }
      }
      if (entry?.accountId !== mainAccount.id) {
        let entryAccount = accounts[entry.accountId];
        if (entryAccount && entryAccount.startingBal > 0) {
          if (entryAccount.runningBal > 0) {
            let interestRate = +entryAccount.interestRate;
            if (entryAccount.interestRate2 > 0 && entryAccount.interestRate2Date) {
              const interestRate2Date = new Date(entryAccount.interestRate2Date);
              if (entry.date > interestRate2Date) {
                interestRate = +entryAccount.interestRate2;
              }
              // logd(`[interestRate2] ${entryAccount.interestRate2} ${entry.date} > ${interestRate2Date}  ${entryAccount.interestRate2Date} ${interestRate}`);
            }
            if (interestRate > 0) {
              const interest = (interestRate / 100 / 12) * entryAccount.runningBal;
              // logd(`[interest] ${entryAccount.id} ${entry.date} ${interestRate}% $${entryAccount.runningBal} ($${interest})`);
              tableEntries.at(-1).monthlyInterest = +interest;
              entryAccount.runningBal += interest;
            }
            if (entryAccount.runningBal <= entry.amount && entryAccount.runningBal > 1) {
              // logd(
              //   `[entryAccountId0] ${entry.accountId} bal: ${entryAccount.runningBal} type: ${entry.type} amount: ${entry.amount} extra: ${extraMonthlyPayment}`,
              //   entry,
              // );
              extraMonthlyPayment += +entry.amount - +entryAccount.runningBal;
              entry.amount = entryAccount.runningBal;
              entry.flag = 'paid-off';
            }
            logd(`[accountId1] ${entry.accountId} ${entryAccount.runningBal} ${entry.type} ${entry.amount}`, {
              entry,
              mainAccount,
              entryAccount,
              extraMonthlyPayment,
            });
            entryAccount.runningBal += entry.type === 'C' ? +entry.amount : -entry.amount;
            tableEntries.at(-1).subAccountRunningBal = entryAccount.runningBal;
            // logd(`[accountId2] id: ${entry.accountId} bal: $${entryAccount.runningBal} extra: $${extraMonthlyPayment}`);

            const extraAmount = 250;
            while (extraMonthlyPayment > extraAmount) {
              logd(`[extra payment 0000] extraMonthlyPayment: $${extraMonthlyPayment}, accountId: ${entryAccount.id}, date: ${entry.date}`);
              Object.values(accounts).forEach((account) => {
                if (account.runningBal > 0 && account.interestRate > 0 && extraMonthlyPayment >= extraAmount) {
                  logd(
                    `[extra payment 0] extraMonthlyPayment: $${extraMonthlyPayment}, accountId: ${account.id}, accountExtraPayment: $${account.extraPayment}`,
                  );
                  if (!account.extraPayment) {
                    account.extraPayment = 0;
                  }
                  account.extraPayment = +account.extraPayment + extraAmount;
                  extraMonthlyPayment -= extraAmount;
                  logd(
                    `[extra payment] Applied $${extraAmount} to ${account.id}, extraPayment: $${account.extraPayment}, remaining extraMonthlyPayment: ${extraMonthlyPayment}`,
                  );
                }
              });
            }
            // logd(`[accountId2.5] ${entry.accountId} ${account.runningBal}`, extraMonthlyPayment);
          } else {
            // logd(`[accountId3] ${entry.accountId} ${account.runningBal} ${entry.type} ${entry.amount}`, entry);
            tableEntries.at(-1).subAccountRunningBal = 0;
            entry.amount = 0;
            entry.flag = 'paid-off';
          }
        }
      }
      parsedEntries.splice(i, 1);
    });
  }

  logd('[tableEntries]', { tableEntries, mainAccount, endDate });
  const sortedTableEntries = sortEntries(tableEntries);

  logd('[sortedTableEntries]', { sortedTableEntries, accounts, mainAccount });

  const accountEntries = {};

  sortedTableEntries.forEach((entry, i) => {
    const account = entry.accountId === undefined ? mainAccount : accounts[entry.accountId];
    if (!accountEntries[account?.id]) {
      accountEntries[account?.id] = [];
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
    entry.flag = entry.flag ?? getBalanceFlag(entry.mainBalance, balanceFlags);
    accountEntries[mainAccount.id].push(entry);
    if (mainAccount.id !== account.id) {
      accountEntries[account.id].push(entry);
    }
  });
  Object.entries(accountEntries).forEach(([accountId, entries]) => {
    // logd('[account-entries]', accountId, entries.length, accounts[accountId].balanceIndex);
    accountEntries[accountId].splice(0, accounts[accountId].balanceIndex);
  });
  logd('[accounts]', { accountEntries, accounts });
  // tableEntries.splice(0, balanceIndex);
  return [accountEntries, accounts];
};
