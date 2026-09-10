<script lang="ts">
  import { appStateStore } from '$lib/stores/settings';
  import { onMount } from 'svelte';
  import { fmt } from '$lib/formatters/fmt';
  import { accountDisplayName } from '$lib/parser/accountLabel';
  import Tooltip from './Tooltip.svelte';

  export let tableEntries = [];
  export let accounts = {};
  export let viewingMainAccount = true;

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
          class="balance-{entry.flag}"
        >
          <td>{fmt.date(entry.date)}</td>
          <td class="desc"
            ><Tooltip content={getAccountSummary(entry)}>{descriptionFor(entry)}</Tooltip></td
          >
          <td class="num-col" align="right">{entry.type === 'C' ? fmt.curr(entry.amount) : ''}</td>
          <td class="num-col" align="right">{entry.type === 'D' ? fmt.curr(entry.amount) : ''}</td>
          <td align="right">{flagIndicator(entry.flag)}{displayBalance(entry)}</td>
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

  @media (max-width: 40em) {
    table {
      min-width: 0;
      font-size: 0.75rem;
    }
    .num-col {
      display: none;
    }
    .month-summary td:nth-child(n + 2) {
      display: none;
    }
    .month-summary td:first-child {
      display: table-cell;
    }
  }
</style>
