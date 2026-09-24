<script lang="ts">
  import { categoryName, type Category, UNFILED_ID } from '$lib/data/categories';
  import { isHttpUrl } from '$lib/parser/lineExtras';
  import {
    insertSourceLine,
    readSourceLines,
    removeSourceLine,
    replaceSourceLine,
    writeSourceLine,
    type SourceLine,
  } from '$lib/parser/sourceLines';
  import { fmt } from '$lib/formatters/fmt';

  export let raw = '';
  export let categories: Category[] = [];
  export let onCommit: (next: string) => void = () => {};

  let typeFilter: 'all' | 'C' | 'D' = 'all';
  let groupFilter = 'all';
  let openIndex: number | null = null;
  let draft: SourceLine | null = null;
  let openedSerialized = '';
  let openedHadAutopay = false;
  let error = '';
  let removeIndex: number | null = null;

  $: lines = readSourceLines(raw);
  $: entries = lines.filter((line) => line.kind === 'entry');
  $: visible = entries.filter((line) => {
    if (typeFilter !== 'all' && line.type !== typeFilter) return false;
    if (groupFilter === 'all') return true;
    const id = line.extras.categoryId || UNFILED_ID;
    return id === groupFilter;
  });
  $: unfiledCount = entries.filter((line) => !line.extras.categoryId || line.extras.categoryId === UNFILED_ID).length;

  function commit(next: string) {
    if (next === raw) return;
    onCommit(next);
  }

  function open(line: SourceLine) {
    openIndex = line.index;
    draft = {
      ...line,
      extras: { ...line.extras, unknown: [...line.extras.unknown] },
      overrides: { ...line.overrides },
    };
    openedSerialized = writeSourceLine(draft);
    openedHadAutopay = line.extras.autopay !== undefined;
    error = '';
  }

  function close() {
    if (!draft) {
      openIndex = null;
      return;
    }
    const datePart = draft.when.split(',')[0] ?? '';
    if (datePart && !/^\d{4}-\d{1,2}-(?:\d{1,2}|L)$/i.test(datePart)) {
      error = 'Use a date like 2026-04-15.';
      return;
    }
    if (draft.extras.payUrl && !isHttpUrl(draft.extras.payUrl)) {
      error = 'Pay link must start with https:// or http://.';
      return;
    }
    if (draft.extras.notes?.includes('|')) {
      error = 'Notes cannot contain a | character.';
      return;
    }
    if (draft.extras.minRate !== undefined && String(draft.extras.minRate) !== '') {
      draft.extras.minRate = +draft.extras.minRate;
      if (Number.isNaN(draft.extras.minRate)) {
        error = 'Minimum rate must be a number like 0.02.';
        return;
      }
    } else {
      draft.extras.minRate = undefined;
    }
    if (!draft.extras.categoryId) draft.extras.categoryId = undefined;
    const nextLine = writeSourceLine(draft);
    const index = draft.index;
    const unchanged = nextLine === openedSerialized;
    openIndex = null;
    draft = null;
    error = '';
    if (!unchanged) commit(replaceSourceLine(raw, index, nextLine));
  }

  function onKey(event: KeyboardEvent) {
    if (event.key === 'Escape' && draft) close();
  }

  function setAutopay(checked: boolean) {
    if (!draft) return;
    if (checked) draft.extras.autopay = true;
    else draft.extras.autopay = openedHadAutopay ? false : undefined;
  }

  function disable(line: SourceLine) {
    const next = { ...line, disabled: !line.disabled };
    commit(replaceSourceLine(raw, line.index, writeSourceLine(next)));
  }

  function clone(line: SourceLine) {
    const copy = writeSourceLine({ ...line, disabled: false });
    commit(insertSourceLine(raw, line.index, copy));
  }

  function confirmRemove() {
    if (removeIndex === null) return;
    commit(removeSourceLine(raw, removeIndex));
    removeIndex = null;
    openIndex = null;
    draft = null;
  }

  function whenLabel(when: string): string {
    const [date, token = ''] = when.split(',');
    const shift = token.includes('<') || date?.includes('<')
      ? ' · prior business day'
      : token.includes('>') || date?.includes('>')
        ? ' · next business day'
        : '';
    const day = (date ?? '').replace(/[<>]/g, '') || 'No date';
    const recur = token.replace(/[<>]/g, '');
    if (!recur) return `${day}${shift}`;
    return `${day} · ${cadence(recur)}${shift}`;
  }

  function cadence(recur: string): string {
    if (recur === 'R' || recur === 'RM' || recur === 'R1M') return 'monthly';
    if (recur === 'RW' || recur === 'R1W') return 'weekly';
    if (recur === 'R2W') return 'every 2 weeks';
    if (recur === 'RY' || recur === 'R1Y') return 'yearly';
    if (recur === 'RD' || recur === 'R1D') return 'daily';
    const every = recur.match(/^R(\d+)([DWMY])$/i);
    if (!every) return recur.replace(/^R/, '');
    const unit = { D: 'days', W: 'weeks', M: 'months', Y: 'years' }[every[2].toUpperCase()] ?? every[2];
    return `every ${every[1]} ${unit}`;
  }
</script>

<svelte:window on:keydown={onKey} />

<div class="cards">
  <div class="command">
    <div class="segments" role="group" aria-label="Entry type">
      {#each [
        ['all', 'All', entries.length],
        ['C', 'Credits', entries.filter((line) => line.type === 'C').length],
        ['D', 'Debits', entries.filter((line) => line.type === 'D').length],
      ] as [id, label, count]}
        <button type="button" class:selected={typeFilter === id} on:click={() => (typeFilter = id)}>
          {label} ({count})
        </button>
      {/each}
    </div>
    <label>
      Group
      <select bind:value={groupFilter}>
        <option value="all">All groups</option>
        {#each categories as category}
          <option value={category.id}>
            {category.name}{category.id === UNFILED_ID && unfiledCount > 0 ? ` (${unfiledCount})` : ''}
          </option>
        {/each}
      </select>
    </label>
  </div>

  <ul class="list">
    {#each visible as line}
      <li class:disabled={line.disabled}>
        <button type="button" class="body" on:click={() => open(line)}>
          <span class="chip">{line.type}</span>
          <span class="desc">{line.desc || 'Untitled'}</span>
          <span class="amount">{fmt.curr(+line.amount || 0)}</span>
          <span class="when">{whenLabel(line.when)}</span>
          <span class="cat">{categoryName(line.extras.categoryId, categories)}</span>
          {#if line.extras.startingBal !== undefined}
            <span class="hint">Starts at {fmt.curr(line.extras.startingBal)}</span>
          {/if}
        </button>
        <details class="kebab">
          <summary aria-label="Entry actions">⋮</summary>
          <button type="button" on:click={() => open(line)}>Edit</button>
          <button type="button" on:click={() => clone(line)}>Clone</button>
          <button type="button" on:click={() => disable(line)}>{line.disabled ? 'Enable' : 'Disable'}</button>
          <button type="button" class="danger" on:click={() => (removeIndex = line.index)}>Remove line</button>
        </details>
      </li>
    {:else}
      <li class="empty">No entries in this filter.</li>
    {/each}
  </ul>
</div>

{#if draft}
  <div class="backdrop" role="presentation" on:click={close}></div>
  <form
    class="editor"
    role="dialog"
    aria-label="Edit entry"
    on:submit|preventDefault={close}
  >
    <header>
      <h3>Edit entry</h3>
      <button type="button" on:click={close} aria-label="Close and save">×</button>
    </header>
    {#if error}<p class="error">{error}</p>{/if}
    <label>Type
      <select bind:value={draft.type}>
        <option value="B">Balance</option>
        <option value="C">Money in</option>
        <option value="D">Money out</option>
      </select>
    </label>
    <label>When <input bind:value={draft.when} /></label>
    <label>Amount <input bind:value={draft.amount} inputmode="decimal" /></label>
    <label>Description <input bind:value={draft.desc} /></label>
    <label>Category
      <select
        value={draft.extras.categoryId ?? ''}
        on:change={(event) => {
          if (draft) draft.extras.categoryId = event.currentTarget.value || undefined;
        }}
      >
        <option value="">Unfiled</option>
        {#each categories.filter((category) => category.id !== UNFILED_ID) as category}
          <option value={category.id}>{category.name}</option>
        {/each}
      </select>
    </label>
    {#if draft.accountSuffix || draft.extras.accountSlot}
      <label>Payment style
        <select bind:value={draft.extras.strategy}>
          <option value={undefined}>Scheduled amount</option>
          <option value="fixed">Fixed amount</option>
          <option value="min">Minimum rate</option>
          <option value="pct">Percent of balance</option>
        </select>
      </label>
      <label>Minimum rate <input bind:value={draft.extras.minRate} placeholder="0.10 = 10%" /></label>
      <label>Pay link <input bind:value={draft.extras.payUrl} placeholder="https://" /></label>
      <label>Notes <input bind:value={draft.extras.notes} /></label>
      <label class="check">
        <input
          type="checkbox"
          checked={!!draft.extras.autopay}
          on:change={(event) => setAutopay(event.currentTarget.checked)}
        />
        Autopay
      </label>
    {/if}
    <button type="submit" class="button-action">Save and close</button>
  </form>
{/if}

{#if removeIndex !== null}
  <div class="backdrop" role="presentation" on:click={() => (removeIndex = null)}></div>
  <div class="editor confirm" role="dialog" aria-label="Remove line">
    <p>Remove this line from the scenario? Disable keeps it in the file instead.</p>
    <button type="button" on:click={() => (removeIndex = null)}>Cancel</button>
    <button type="button" class="danger" on:click={confirmRemove}>Remove line</button>
  </div>
{/if}

<style lang="scss">
  @use '../scss/colors' as *;

  .cards { text-align: left; }
  .command {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: end;
    margin-bottom: 0.75rem;
  }
  .segments { display: flex; gap: 0.25rem; }
  .segments button, .kebab button, .editor button {
    border: 1px solid $clr-border;
    background: #fff;
    border-radius: 0.35rem;
    padding: 0.35rem 0.6rem;
    cursor: pointer;
  }
  .segments button.selected { background: $clr-accent-soft; font-weight: 700; }
  .list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.45rem; }
  li {
    display: flex;
    gap: 0.35rem;
    align-items: stretch;
    border: 1px solid $clr-border;
    border-radius: 0.4rem;
    background: #fff;
    &.disabled { opacity: 0.55; }
  }
  .body {
    flex: 1;
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 0.15rem 0.6rem;
    text-align: left;
    border: 0;
    background: transparent;
    padding: 0.55rem 0.7rem;
    cursor: pointer;
  }
  .chip { font-weight: 700; color: $clr-accent-ink; }
  .amount { font-variant-numeric: tabular-nums; }
  .when, .cat, .hint { grid-column: 2; color: $clr-muted; font-size: 0.82rem; }
  .kebab summary {
    list-style: none;
    cursor: pointer;
    min-width: 44px;
    min-height: 44px;
    display: grid;
    place-items: center;
  }
  .kebab button { display: block; width: 100%; text-align: left; }
  .danger { color: #8a1f1f; }
  .empty { padding: 0.8rem; color: $clr-muted; }
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(28, 33, 28, 0.35);
    z-index: 20;
  }
  .editor {
    position: fixed;
    z-index: 21;
    left: 50%;
    top: 8vh;
    transform: translateX(-50%);
    width: min(32rem, calc(100% - 1.5rem));
    max-height: 84vh;
    overflow: auto;
    background: #fff;
    border-radius: 0.5rem;
    padding: 0.9rem 1rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    text-align: left;
  }
  .editor header { display: flex; justify-content: space-between; align-items: center; }
  .editor h3 { margin: 0; }
  .editor label { display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.85rem; }
  .editor input, .editor select { font: inherit; padding: 0.35rem 0.45rem; }
  .check { flex-direction: row; align-items: center; }
  .error { color: #8a1f1f; margin: 0; }
  .confirm { gap: 0.6rem; }
</style>
