<script lang="ts">
  import { appStateStore, rawEntriesStore } from '$lib/stores/settings';
  import { setRawEntries } from '$lib/data/entriesPersistence';
  import { applyForecastEdit, type ForecastEditScope } from '$lib/parser/occurrenceEdit';
  import { onMount } from 'svelte';
  import { fmt } from '$lib/formatters/fmt';
  import { flagIndicator, flagLabel } from '$lib/formatters/thresholdMarks';
  import { accountDisplayName } from '$lib/parser/accountLabel';
  import type { ParsedEntry } from '$lib/parser/types';
  import Tooltip from './Tooltip.svelte';
  import ThresholdLegend from './ThresholdLegend.svelte';

  export let tableEntries: ParsedEntry[] = [];
  export let accounts = {};
  export let viewingMainAccount = true;

  let editIndex: number | null = null;
  let editDate = '';
  let editAmount = 0;
  let editScope: ForecastEditScope = 'occurrence';
  let editPending = false;

  $: mainAccount = Object.values(accounts).find((account) => account.isMain);

  function displayBalance(entry) {
    if (viewingMainAccount) {
      return fmt.curr(entry.mainBalance);
    }
    return fmt.curr(entry.subAccountRunningBal ?? entry.balance ?? entry.mainBalance);
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
      if (entry.inBalance) {
        return;
      }
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
    editScope = 'occurrence';
    editPending = !!entry.pending;
  }

  function cancelEdit(e?: Event) {
    e?.stopPropagation();
    editIndex = null;
  }

  function saveEdit(e: Event, entry: ParsedEntry) {
    e.stopPropagation();
    const next = applyForecastEdit($rawEntriesStore, entry, {
      date: editDate,
      amount: +editAmount,
      scope: entry.recur ? editScope : 'occurrence',
      pending: entry.inBalanceEligible ? editPending : undefined,
    });
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
    Click a row to edit. Same-day items already in the <code>B</code> line stay marked
    <em>in balance</em>. <a href="#help">Help</a> has the rest.
  </p>
  <ThresholdLegend compact />
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
          class:in-balance={entry.inBalance}
          class="balance-{entry.flag}"
          title={entry.inBalance
            ? 'Already counted in the same-day balance line. Click to mark as not yet posted.'
            : entry.pending && entry.inBalanceEligible
              ? 'Marked not yet posted — this amount still applies after the balance.'
            : entry.recur
              ? `Click to adjust occurrence #${entry.occurrenceIndex ?? 1} or the whole series`
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
              {#if entry.inBalanceEligible}
                <label class="pending-toggle">
                  <input type="checkbox" bind:checked={editPending} />
                  Not yet posted
                </label>
                <span class="occ">
                  {#if editPending}
                    Apply this amount after the balance.
                  {:else}
                    Already in today's balance.
                  {/if}
                </span>
              {/if}
              {#if entry.recur}
                <fieldset class="scope">
                  <legend class="sr-only">Apply edit to</legend>
                  <label>
                    <input type="radio" bind:group={editScope} value="occurrence" />
                    This one
                  </label>
                  <label>
                    <input type="radio" bind:group={editScope} value="series" />
                    Whole series
                  </label>
                </fieldset>
                <span class="occ">
                  {#if editScope === 'series'}
                    Rewrites the line. Drops #N exceptions.
                  {:else}
                    Occurrence #{entry.occurrenceIndex ?? 1} only
                  {/if}
                </span>
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
              ><Tooltip content={getAccountSummary(entry)}>{descriptionFor(entry)}</Tooltip
              >{#if entry.inBalance}
                <span class="in-balance-tag">in balance</span>{/if}{#if entry.pending && entry.inBalanceEligible}
                <span class="in-balance-tag pending-tag">not yet posted</span>{/if}</td
            >
            <td class="num-col" align="right"
              >{#if entry.type === 'C'}{#if entry.inBalance}<s>{fmt.curr(entry.amount)}</s
                  >{:else}{fmt.curr(entry.amount)}{/if}{/if}</td
            >
            <td class="num-col" align="right"
              >{#if entry.type === 'D'}{#if entry.inBalance}<s>{fmt.curr(entry.amount)}</s
                  >{:else}{fmt.curr(entry.amount)}{/if}{/if}</td
            >
            <td align="right"
              >{flagIndicator(entry.flag)}{displayBalance(entry)}{#if flagLabel(entry.flag)}
                <span class="flag-word">{flagLabel(entry.flag)}</span>{/if}</td
            >
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
  @use '../scss/colors' as *;

  .table-wrap {
    box-sizing: border-box;
    width: calc(100% - 2rem);
    max-width: 100%;
    min-width: 0;
    margin: 0 auto 2rem;
    overflow-x: auto;
  }

  table {
    width: 100%;
    min-width: 28em;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.8rem;
    border-collapse: collapse;
    td {
      padding: 0.2rem 0.35rem;
      border-bottom: 1px solid $clr-border;
      > :global(div) {
        display: block !important;
      }
    }
    .desc {
      text-align: left;
    }
    .headings {
      background-color: $clr-accent-soft !important;
      color: $clr-accent-ink;
      font-weight: 700;
    }
    .month-summary {
      background-color: $clr-accent-soft !important;
      color: $clr-accent-ink;
      font-weight: 700;
      text-align: right;
    }

    .balance-reset {
      color: $clr-accent-ink !important;
      background-color: $clr-accent-soft !important;
      font-weight: 700;
    }

    .balance-negative {
      background-color: $clr-negative-bg !important;
      color: $clr-negative-ink !important;
      font-weight: 700;
    }

    .balance-low {
      background-color: $clr-low-bg !important;
      color: $clr-low-ink !important;
      font-weight: 700;
    }

    .balance-uncomfortable {
      background-color: $clr-uncomf-bg !important;
      color: $clr-uncomf-ink !important;
      font-weight: 700;
    }

    .balance-paid-off {
      background-color: $clr-paidoff-bg !important;
      color: $clr-paidoff-ink !important;
      font-weight: 700;
    }

    .balance-goal {
      background-color: $clr-goal-bg !important;
      color: $clr-goal-ink !important;
      font-weight: 700;
    }

    .new-month {
      font-weight: 700;
      font-size: 1.25rem;
      padding-top: 1rem;
      background-color: $clr-surface !important;
      color: $clr-accent-ink;
      border-bottom: none;
    }

    tbody tr:nth-child(odd) {
      background-color: #f3f6f3;
    }
  }

  .flag-word {
    display: inline-block;
    margin-left: 0.3rem;
    font-size: 0.68rem;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }

  .edit-hint {
    margin: 0 0 0.45rem;
    font-size: 0.8rem;
    color: $clr-muted;
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
    outline: 2px solid $clr-accent;
    outline-offset: -2px;
  }

  tr.overridden td:first-child abbr {
    margin-left: 0.15rem;
    color: inherit;
    text-decoration: none;
    font-weight: 700;
  }

  tr.in-balance .num-col {
    color: #666;

    s {
      text-decoration: line-through;
      text-decoration-color: rgba(0, 0, 0, 0.45);
    }
  }

  .in-balance-tag {
    display: inline-block;
    margin-left: 0.4rem;
    padding: 0 0.4rem;
    font-size: 0.7rem;
    font-weight: 700;
    line-height: 1.4;
    color: #555;
    background: rgba(0, 0, 0, 0.06);
    border: 1px solid rgba(0, 0, 0, 0.15);
    border-radius: 0.3rem;
    vertical-align: middle;
    white-space: nowrap;
  }

  .pending-tag {
    color: $clr-accent-ink;
    background: $clr-accent-soft;
    border-color: $clr-border-strong;
  }

  .pending-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    margin: 0.25rem 0 0;
    font-size: 0.75rem;
    font-weight: 700;
    color: $clr-accent-ink;
    cursor: pointer;
  }

  .scope {
    display: flex;
    flex-wrap: wrap;
    gap: 0.15rem 0.65rem;
    margin: 0.25rem 0 0;
    padding: 0;
    border: 0;
    font-family: inherit;
    font-size: 0.75rem;
    color: $clr-accent-ink;
  }

  .scope label {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    cursor: pointer;
    font-weight: 600;
  }

  .occ {
    display: block;
    font-size: 0.75rem;
    color: $clr-muted;
    font-family: inherit;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    border: 0;
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
    border: 1px solid $clr-accent;
    border-radius: 0.3rem;
    background: $clr-surface;
    color: $clr-accent-ink;
    cursor: pointer;
  }

  .edit-actions .save {
    background: $clr-accent;
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
