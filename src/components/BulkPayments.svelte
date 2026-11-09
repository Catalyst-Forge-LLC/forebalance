<script lang="ts">
  import CategoryIcon from './CategoryIcon.svelte';
  import { localIsoDate } from '#lib/formatters/dates.ts';
  import { modal } from '#lib/ui/modal.ts';
  import { bulkPaymentRows, applyBulkPayments, changed } from '#lib/parser/bulkPayments.ts';
  import { categoryName, type Category } from '#lib/data/categories.ts';
  export let raw: string;
  export let scenarioId: string;
  export let currency: string;
  export let categories: Category[];
  export let initialGroup: string;
  export let onSave: (next: string) => void;
  export let onClose: () => void;
  const original = raw,
    owner = scenarioId;
  const today = localIsoDate();
  const rows = bulkPaymentRows(original, today);
  const groups = [...new Set(rows.map((r) => r.category))];
  let group =
    initialGroup !== 'all'
      ? initialGroup
      : rows.some((r) => r.category === 'credit-cards' && r.balanceEditable)
        ? 'credit-cards'
        : groups.includes('debt')
          ? 'debt'
          : (rows.find((r) => r.balanceEditable)?.category ?? groups[0] ?? 'unfiled');
  const options = [...new Set([group, ...groups])];
  function startDrafts(category: string) {
    return rows.filter((r) => r.category === category).map((row) => ({ row, balance: row.balance, payment: row.payment }));
  }
  let drafts = startDrafts(group);
  function selectCategory(id: string) {
    group = id;
    drafts = startDrafts(id);
    error = '';
  }
  $: count = drafts.filter(changed).length;
  $: stale = raw !== original || scenarioId !== owner;
  let error = '';
  function save() {
    if (stale || !count) return;
    try {
      const next = applyBulkPayments(original, drafts, today);
      onSave(next);
      onClose();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Check the values before saving.';
    }
  }
</script>

<dialog use:modal aria-labelledby="bulk-title" on:cancel|preventDefault={onClose}>
  <form on:submit|preventDefault={save}>
    <header>
      <h2 id="bulk-title">Update balances and payments</h2>
      <p>Balances are as of the end of today ({today}), in {currency}. Payments change after today. Leave a field untouched to keep its forecast.</p>
      <label
        ><CategoryIcon id={group} /> Category
        <select value={group} disabled={count > 0} on:change={(event) => selectCategory(event.currentTarget.value)}
          >{#each options as id (id)}<option value={id}>{categoryName(id, categories)}</option>{/each}</select
        ></label
      >
      {#if count}<small>Save or cancel these edits to switch category.</small>{/if}
    </header>
    <div class="rows">
      {#if drafts.length}
        <table aria-label="Balances and payments in {currency}">
          <colgroup><col /><col class="balance-col" /><col class="payment-col" /></colgroup>
          <thead><tr><th scope="col">Entry</th><th scope="col">Balance · {today}</th><th scope="col">Payment</th></tr></thead>
          <tbody>
            {#each drafts as d (d.row.index)}
              <tr>
                <th scope="row" title={d.row.name}>{d.row.name}</th>
                <td
                  >{#if d.row.balanceEditable}
                    <input
                      aria-label={'Balance today (' + currency + ') for ' + d.row.name}
                      inputmode="decimal"
                      bind:value={d.balance}
                      placeholder="No change"
                    />
                  {:else}<small title={d.row.shared ? 'Shared account — edit separately' : 'No debt account'}>{d.row.shared ? 'Shared' : '—'}</small>{/if}</td
                >
                <td
                  ><div class="payment">
                    <input
                      aria-label={(d.row.strategy === 'pct'
                        ? 'Payment rate (%)'
                        : d.row.strategy === 'min'
                          ? 'Payment floor (' + currency + ')'
                          : 'Scheduled payment (' + currency + ')') +
                        ' for ' +
                        d.row.name}
                      inputmode="decimal"
                      bind:value={d.payment}
                    />
                    {#if d.row.strategy !== 'fixed'}<small>{d.row.strategy === 'pct' ? '%' : 'min'}</small>{/if}
                  </div></td
                >
              </tr>
            {/each}
          </tbody>
        </table>
      {:else}<p>No active debit entries in this category.</p>{/if}
    </div>
    <footer>
      {#if stale}<p role="alert">The scenario changed. Cancel and reopen to use its latest values.</p>{:else if error}<p role="alert">{error}</p>{/if}
      <span aria-live="polite">{count} {count === 1 ? 'entry' : 'entries'} changed</span>
      <button type="button" on:click={onClose}>Cancel</button><button class="save" type="submit" disabled={!count || stale}>Save changes</button>
    </footer>
  </form>
</dialog>

<style>
  dialog {
    width: min(36rem, 94vw);
    max-height: 88dvh;
    box-sizing: border-box;
    padding: 0;
    margin: auto;
    border: 1px solid #afbfaf;
    border-radius: 0.55rem;
    color: #213c2b;
    background: white;
  }
  dialog::backdrop {
    background: #10241980;
  }
  form {
    display: flex;
    flex-direction: column;
    max-height: 86dvh;
  }
  header,
  footer,
  .rows {
    padding: 0.8rem 1rem;
  }
  header,
  footer {
    background: #f3f6f0;
  }
  h2 {
    margin: 0;
    font-size: 1.15rem;
  }
  p {
    padding: 0;
    margin: 0.35rem 0 0.65rem;
    font-size: 0.85rem;
  }
  label {
    display: block;
    font-size: 0.8rem;
    font-weight: 600;
  }
  input,
  select {
    padding: 0.35rem;
    border: 1px solid #aebdaf;
    border-radius: 0.3rem;
    min-width: 0;
    background: white;
  }
  .rows {
    overflow: auto;
    min-height: 0;
  }
  table {
    width: 100%;
    table-layout: fixed;
    border-collapse: collapse;
    text-align: left;
    font-size: 0.85rem;
  }
  .balance-col {
    width: 7rem;
  }
  .payment-col {
    width: 8rem;
  }
  th,
  td {
    padding: 0.26rem 0.3rem;
    border-bottom: 1px solid #d9e0d7;
  }
  thead th {
    position: sticky;
    top: 0;
    background: #f3f6f0;
    color: #435746;
    font-size: 0.75rem;
  }
  tbody th {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 600;
  }
  .payment {
    display: flex;
    align-items: center;
    gap: 0.2rem;
  }
  td input {
    width: 8ch;
    max-width: 100%;
    box-sizing: border-box;
    font: inherit;
    font-variant-numeric: tabular-nums;
    text-align: right;
    padding: 0.17rem 0.3rem;
  }
  td small {
    font-size: 0.7rem;
    color: #455746;
  }
  @media (max-width: 32rem) {
    .rows {
      padding: 0.4rem;
    }
    .balance-col {
      width: 5.2rem;
    }
    .payment-col {
      width: 6.4rem;
    }
    td input {
      width: 7.5ch;
    }
  }
  footer {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  footer span {
    margin-right: auto;
    font-size: 0.8rem;
  }
  footer p {
    width: 100%;
    color: #751e19;
  }
  button {
    padding: 0.4rem 0.65rem;
    border-radius: 0.3rem;
    border: 1px solid #aebdaf;
    background: white;
    cursor: pointer;
  }
  .save {
    background: #163f2b;
    color: white;
  }
  .save:disabled {
    opacity: 0.5;
  }
</style>
