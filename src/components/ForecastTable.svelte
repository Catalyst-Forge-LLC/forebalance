<script>
  import { appStateStore, rawEntriesStore } from '$lib/stores/settings';
  import { updateEntry } from '$lib/parser/parseEntries';
  import { onMount } from 'svelte';
  import { fmt } from '$lib/formatters/fmt';
  import { logd } from '$lib/util/log';
  import Tooltip from './Tooltip.svelte';

  export let tableEntries = [];
  export let accounts = {};

  const mainAccount = Object.values(accounts).find((account) => account.isMain);

  $: entryCount = tableEntries.length;

  let entryInputs = {};

  let startMonthIndex = 0;

  let showEntryEdit = null;

  const isNewMonth = (date1, date2) => {
    return date1.getMonth() != date2.getMonth();
  };

  onMount(async () => {
    $appStateStore.showLoader = false;
  });

  const showMonthHeader = (i) => {
    let showHeader = false;
    if (i > 0 && isNewMonth(tableEntries[i].date, tableEntries[i - 1].date)) {
      showHeader = true;
    } else if (i === 0) {
      showHeader = true;
    }
    if (showHeader) {
      startMonthIndex = i;
    }
    return showHeader;
  };

  const showMonthFooter = (i) => {
    let showFooter = false;
    const entry = tableEntries[i];
    if (i >= 0 && i < entryCount - 1 && isNewMonth(entry.date, tableEntries[i + 1].date)) {
      showFooter = true;
    } else if (i === entryCount - 1) {
      showFooter = true;
    }
    return showFooter;
  };

  const monthSummary = (i) => {
    let summaryCredit = 0;
    let summaryDebit = 0;
    let summaryNet = 0;
    tableEntries.slice(startMonthIndex, i + 1).forEach((entry) => {
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
    tableEntries.slice(startMonthIndex, i + 1).forEach((entry) => {
      if (entry.subAccountRunningBal) {
        logd('[running-balance-monthly-summary]', entry);
        debtBalance += +entry.subAccountRunningBal;
        if (entry.monthlyInterest) {
          debtInterest += +entry.monthlyInterest;
        }
        if (entry.accountId !== mainAccount.id) {
          debtDetails += `${entry.accountId}: ${fmt.curr(entry.subAccountRunningBal)} (${entry.monthlyInterest ? fmt.curr(entry.monthlyInterest) : 'n/a'})<br>`;
        }
      }
    });
    return { debtBalance, debtInterest, debtDetails };
  };

  function clickEntry(e, entry, i) {
    if (showEntryEdit === null) {
      // document.querySelector('.entry-modal').style.top = e.layerY + 'px';
      entryInputs = { ...entry };
      entryInputs.date = fmt.date3(entryInputs.date);
      entryInputs.amount = +entryInputs.amount;
      logd('[click-entry]', e, entry);
      showEntryEdit = i;
    }
  }

  function saveEntry(e, entry, i) {
    e.stopPropagation();
    showEntryEdit = null;
    $rawEntriesStore = updateEntry($rawEntriesStore, entry, entryInputs);
    localStorage.setItem('rawEntries', $rawEntriesStore);
  }

  function cancelEntry(e) {
    e.stopPropagation();
    showEntryEdit = null;
  }

  function getAccountSummary(entry) {
    const account = accounts[entry.accountId];
    if (account && account !== mainAccount && account.startingBal > 0) {
      return `
AccountId: ${entry.accountId}<br>
Starting Balance: ${fmt.curr(account.startingBal)}<br>
Running Balance: ${fmt.curr(entry.subAccountRunningBal)}<br>
${entry.monthlyInterest ? `Monthly Interest: ${fmt.curr(entry.monthlyInterest)}<br>` : ''}
${account.interestRate ? `Interest Rate: ${account.interestRate}%<br>` : ''}`;
    }
    return '';
  }
</script>

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
          <td>Credit</td>
          <td>Debit</td>
          <td>Balance</td>
        </tr>
      {/if}
      <tr
        class:balance-reset={entry.type === 'B'}
        class="balance-{entry.flag}"
        on:click={(e) => {
          clickEntry(e, entry, i);
        }}
      >
        {#if showEntryEdit === i}
          <td>
            <input type="date" bind:value={entryInputs.date} />
          </td>
          <td>
            <textarea bind:value={entryInputs.desc}></textarea>
          </td>
          <td colspan="2">
            <select bind:value={entryInputs.type} disabled={entryInputs.type === 'B'}>
              <option value="B" disabled>Balance</option>
              <option value="C">Credit</option>
              <option value="D">Debit</option>
            </select>

            <input type="number" bind:value={entryInputs.amount} />
          </td>
          <td>
            <button
              on:click={(e) => {
                cancelEntry(e);
              }}>CANCEL</button
            >

            <button
              on:click={(e) => {
                saveEntry(e, entry, i);
              }}>SAVE</button
            >
          </td>
        {:else}
          <td>{fmt.date(entry.date)}</td>
          <td align="left"
            ><Tooltip content={getAccountSummary(entry)}>{entry.desc}{mainAccount.id !== entry.accountId ? ` [${entry.accountId}]` : ''}</Tooltip></td
          >
          <td align="right">{entry.type === 'C' ? fmt.curr(entry.amount) : ''}</td>
          <td align="right">{entry.type === 'D' ? fmt.curr(entry.amount) : ''}</td>
          <td align="right">{fmt.curr(entry.mainBalance)}</td>
        {/if}
      </tr>
      {#if showMonthFooter(i)}
        {@const { debtBalance, debtInterest, debtDetails } = runningBalanceMonthlySummary(i)}
        <tr class="month-summary">
          <td colspan="2">Summary</td>
          {#each monthSummary(i) as summary}
            <td>{summary}</td>
          {/each}
        </tr>
        <tr class="debt-summary">
          <td colspan="5"><Tooltip content={debtDetails}>Debt Balance: {fmt.curr(debtBalance)}, Debt Interest: {fmt.curr(debtInterest)}</Tooltip></td>
        </tr>
      {/if}
    {/each}
  </tbody>
</table>

<style lang="scss">
  table {
    width: calc(100% - 2rem);
    margin: 0 0.125rem;
    font-family: monospace;
    font-size: 0.75rem;
    transform: opacity 2s;
    tr {
      opacity: 0.85;
      transition: opacity 0.125s;
      &:hover {
        opacity: 1;
      }
    }
    td {
      padding: 0 3px;
      box-shadow: inset -6px 0 8px -8px rgba(0, 0, 0, 0.25);
      &.new-month {
        box-shadow: none;
      }
      margin-top: 1px;
      > :global(div) {
        display: block !important;
      }
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

  .entry-modal {
    position: absolute;
    margin: 0 auto;
    top: -1000px;
    width: 75%;
    left: 12.5%;
    background: #fff;
    border-radius: 1rem;
    padding: 0.5rem;
    box-shadow: 0.25rem 0.25rem 0.5rem rgba(0, 0, 0, 0.75);
  }
</style>
