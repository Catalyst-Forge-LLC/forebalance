<script lang="ts">
  import { appStateStore, rawEntriesStore } from '$lib/stores/settings';
  import { setRawEntries } from '$lib/data/entriesPersistence';
  import { applyForecastEdit } from '$lib/parser/occurrenceEdit';
  import { onMount } from 'svelte';
  import { fmt } from '$lib/formatters/fmt';
  import { accountDisplayName } from '$lib/parser/accountLabel';
  import type { ParsedEntry } from '$lib/parser/types';
  import Tooltip from './Tooltip.svelte';

  export let tableEntries: ParsedEntry[] = [];
  export let accounts = {};
  export let viewingMainAccount = true;

  let editIndex: number | null = null;
  let editDate = '';
  let editAmount = 0;

  $: mainAccount = Object.values(accounts).find((account) => account.isMain);

  function displayBalance(entry) {
    if (viewingMainAccount) {
      return fmt.curr(entry.mainBalance);
    }
    return fmt.curr(entry.subAccountRunningBal ?? entry.balance ?? entry.mainBalance);
  }

  function flagIndicator(flag) {
    if (flag === 'negative') return '⚠ ';
    if (flag === 'low') return '▼ ';
    if (flag === 'uncomfortable') return '◆ ';
    if (flag === 'goal') return '▲ ';
    if (flag === 'paid-off') return '✓ ';
    return '';
  }

  const isNewMonth = (date1, date2) => date1.getMonth() != date2.getMonth();

  $: entryCount = tableEntries.length;
  $: monthStartIndexes = new Set(
    tableEntries.flatMap((entry, i) =>
      i === 0 || isNewMonth(entry.date, tableEntries[i - 1].date) ? [i] : [],
    ),
  );

  function monthStartFor(i) {
    for (let j = i; j >= 0; j--) {
      if (monthStartIndexes.has(j)) return j;
    }
    return 0;
  }

  onMount(async () => {
    $appStateStore.showLoader = false;
  });

  const showMonthHeader = (i) => monthStartIndexes.has(i);

  const showMonthFooter = (i) => {
    const entry = tableEntries[i];
    if (i >= 0 && i < entryCount - 1 && isNewMonth(entry.date, tableEntries[i + 1].date)) {
      return true;
    }
    return i === entryCount - 1;
  };

  const monthSummary = (i) => {
    let summaryCredit = 0;
    let summaryDebit = 0;
    let summaryNet = 0;
    tableEntries.slice(monthStartFor(i), i + 1).forEach((entry) => {
      if (entry.type === 'C') {
        summaryCredit += +entry.amount;
        summaryNet += +entry.amount;
      } else if (entry.type === 'D') {
        summaryDebit += +entry.amount;
        summaryNet -= +entry.amount;
      }
    });
    return [fmt.curr(summaryCredit), fmt.curr(summaryDebit), 'NET ' + fmt.curr(summaryNet)];
  };

  const runningBalanceMonthlySummary = (i) => {
    let debtBalance = 0;
    let debtInterest = 0;
    let debtDetails = '';
    tableEntries.slice(monthStartFor(i), i + 1).forEach((entry) => {
      if (entry.subAccountRunningBal) {
        debtBalance += +entry.subAccountRunningBal;
        if (entry.monthlyInterest) {
          debtInterest += +entry.monthlyInterest;
        }
        if (mainAccount && entry.accountId !== mainAccount.id) {
          debtDetails += `${entry.accountId}: ${fmt.curr(entry.subAccountRunningBal)} (${entry.monthlyInterest ? fmt.curr(entry.monthlyInterest) : 'n/a'})<br>`;
        }
      }
    });
    return { debtBalance, debtInterest, debtDetails };
  };

  function beginEdit(entry: ParsedEntry, i: number) {
    if (editIndex === i) return;
    editIndex = i;
    editDate = fmt.date3(entry.date);
    editAmount = +entry.amount;
  }

  function cancelEdit(e?: Event) {
    e?.stopPropagation();
    editIndex = null;
  }

  function saveEdit(e: Event, entry: ParsedEntry) {
    e.stopPropagation();
    const next = applyForecastEdit($rawEntriesStore, entry, { date: editDate, amount: +editAmount });
    editIndex = null;
    if (next !== $rawEntriesStore) {
      setRawEntries(next);
    }
  }

  function rowKeydown(e: KeyboardEvent, entry: ParsedEntry) {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit(e, entry);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit(e);
    }
  }

  function getAccountSummary(entry) {
    const account = accounts[entry.accountId];
    if (account && account !== mainAccount && account.startingBal > 0) {
      return `
${accountDisplayName(account)}<br>
Started: ${fmt.curr(account.startingBal)}<br>
Remaining: ${fmt.curr(entry.subAccountRunningBal)}<br>
${entry.monthlyInterest ? `Monthly interest: ${fmt.curr(entry.monthlyInterest)}<br>` : ''}
${account.interestRate ? `APR: ${account.interestRate}%<br>` : ''}`;
    }
    return '';
  }

  function descriptionFor(entry) {
    const extra =
      mainAccount && entry.accountId && mainAccount.id !== entry.accountId
        ? ` [${accountDisplayName(accounts[entry.accountId])}]`
        : '';
    if (extra && entry.desc && entry.desc.includes(accountDisplayName(accounts[entry.accountId]))) {
      return entry.desc;
    }
    return `${entry.desc ?? ''}${extra}`;
  }
</script>

<div class="table-wrap">
  <p class="edit-hint">
    Click a row to move or change that amount. Recurring lines keep the series and write
    <code>#5=date:amount</code> on Entries.
  </p>
  <table>
    <tbody>
      {#each tableEntries as entry, i}
        {#if showMonthHeader(i)}
          <tr>
            <td class="new-month" colspan="5">{fmt.date2(entry.date)}</td>
          </tr>
          <tr class="headings">
            <td>Date</td>
            <td>Description</td>
            <td class="num-col">Credit</td>
            <td class="num-col">Debit</td>
            <td>Balance</td>
          </tr>
        {/if}
        <tr
          id="forecast-row-{i}"
          class:balance-reset={entry.type === 'B'}
          class:editing={editIndex === i}
          class:overridden={entry.overridden}
          class="balance-{entry.flag}"
          title={entry.recur
            ? `Click to adjust occurrence #${entry.occurrenceIndex ?? 1} only`
            : 'Click to edit this line'}
          on:click={() => beginEdit(entry, i)}
        >
          {#if editIndex === i}
            <td>
              <input
                type="date"
                bind:value={editDate}
                on:click|stopPropagation
                on:keydown={(e) => rowKeydown(e, entry)}
              />
            </td>
            <td class="desc">
              {descriptionFor(entry)}
              {#if entry.recur}
                <span class="occ">occurrence #{entry.occurrenceIndex ?? 1} only</span>
              {/if}
            </td>
            <td class="num-col" colspan={entry.type === 'B' ? 2 : 1} align="right">
              {#if entry.type === 'C' || entry.type === 'B'}
                <input
                  type="number"
                  step="any"
                  bind:value={editAmount}
                  on:click|stopPropagation
                  on:keydown={(e) => rowKeydown(e, entry)}
                />
              {/if}
            </td>
            {#if entry.type !== 'B'}
              <td class="num-col" align="right">
                {#if entry.type === 'D'}
                  <input
                    type="number"
                    step="any"
                    bind:value={editAmount}
                    on:click|stopPropagation
                    on:keydown={(e) => rowKeydown(e, entry)}
                  />
                {/if}
              </td>
            {/if}
            <td class="edit-actions" align="right">
              <button type="button" on:click={cancelEdit}>Cancel</button>
              <button type="button" class="save" on:click={(e) => saveEdit(e, entry)}>Save</button>
            </td>
          {:else}
            <td>{fmt.date(entry.date)}{#if entry.overridden}<abbr title="This occurrence was adjusted">*</abbr>{/if}</td>
            <td class="desc"
              ><Tooltip content={getAccountSummary(entry)}>{descriptionFor(entry)}</Tooltip></td
            >
            <td class="num-col" align="right">{entry.type === 'C' ? fmt.curr(entry.amount) : ''}</td>
            <td class="num-col" align="right">{entry.type === 'D' ? fmt.curr(entry.amount) : ''}</td>
            <td align="right">{flagIndicator(entry.flag)}{displayBalance(entry)}</td>
          {/if}
        </tr>
        {#if showMonthFooter(i)}
          {@const { debtBalance, debtInterest, debtDetails } = runningBalanceMonthlySummary(i)}
          <tr class="month-summary">
            <td colspan="2">Summary</td>
            {#each monthSummary(i) as summary, si}
              <td class:num-col={si < 2}>{summary}</td>
            {/each}
          </tr>
          {#if debtBalance > 0 || debtInterest > 0}
            <tr class="debt-summary">
              <td colspan="5"
                ><Tooltip content={debtDetails}
                  >Debt remaining: {fmt.curr(debtBalance)}, interest this month: {fmt.curr(
                    debtInterest,
                  )}</Tooltip
                ></td
              >
            </tr>
          {/if}
        {/if}
      {/each}
    </tbody>
  </table>
</div>

<style lang="scss">
  .table-wrap {
    width: calc(100% - 2rem);
    margin: 0 auto 2rem;
    overflow-x: auto;
  }

  table {
    width: 100%;
    min-width: 28em;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.8rem;
    tr {
      opacity: 0.9;
    }
    td {
      padding: 0.15rem 0.35rem;
      box-shadow: inset -6px 0 8px -8px rgba(0, 0, 0, 0.25);
      &.new-month {
        box-shadow: none;
      }
      > :global(div) {
        display: block !important;
      }
    }
    .desc {
      text-align: left;
    }
    .headings {
      background-color: #990099 !important;
      color: #fff;
    }
    .month-summary {
      background-color: lighten(#990099, 60%) !important;
      font-weight: 700;
      text-align: right;
    }

    .balance-reset {
      color: #fff !important;
      background-color: #050 !important;
    }

    .balance-negative {
      background-color: #ff0000 !important;
      color: #fff !important;
      font-weight: 700;
    }

    .balance-low {
      background-color: #eeaa00 !important;
      color: #fff;
      font-weight: 700;
    }

    .balance-uncomfortable {
      color: #aa9900;
      font-weight: 700;
    }

    .balance-paid-off {
      background-color: #5555bb !important;
      color: #fff !important;
      opacity: 0.75;
      font-weight: 700;
    }

    .balance-goal {
      color: #fff;
      background-color: #009900 !important;
      font-weight: 700;
    }

    .new-month {
      font-weight: 700;
      font-size: 1.25rem;
      padding-top: 1rem;
      background-color: #fff !important;
    }

    tbody tr:nth-child(odd) {
      background-color: #ccffcc;
    }
  }

  .edit-hint {
    margin: 0 0 0.45rem;
    font-size: 0.8rem;
    color: #555;
    text-align: left;
    font-family: inherit;
  }

  .edit-hint code {
    font-size: 0.85em;
  }

  table tr[id^='forecast-row-'] {
    cursor: pointer;
  }

  tr.editing {
    outline: 2px solid #009900;
    outline-offset: -2px;
  }

  tr.overridden td:first-child abbr {
    margin-left: 0.15rem;
    color: inherit;
    text-decoration: none;
    font-weight: 700;
  }

  .occ {
    display: block;
    font-size: 0.75rem;
    color: #555;
    font-family: inherit;
  }

  input[type='date'],
  input[type='number'] {
    width: 100%;
    max-width: 10em;
    box-sizing: border-box;
    font: inherit;
  }

  .edit-actions button {
    margin-left: 0.25rem;
    padding: 0.15rem 0.4rem;
    font-size: 0.75rem;
    border: 1px solid #009900;
    border-radius: 0.3rem;
    background: #fff;
    color: #004400;
    cursor: pointer;
  }

  .edit-actions .save {
    background: #009900;
    color: #fff;
    font-weight: 700;
  }

  @media (max-width: 40em) {
    table {
      min-width: 0;
      font-size: 0.75rem;
    }
    .num-col {
      display: none;
    }
    tr.editing .num-col,
    tr.editing .edit-actions {
      display: table-cell;
    }
    .month-summary td:nth-child(n + 2) {
      display: none;
    }
    .month-summary td:first-child {
      display: table-cell;
    }
  }
</style>
