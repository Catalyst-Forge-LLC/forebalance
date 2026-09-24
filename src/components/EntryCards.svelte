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
  import { settingsStore } from '$lib/stores/settings';
  import { parseEntries } from '$lib/parser/parseEntries';
  import { debtOutlook, type DebtOutlook } from '$lib/parser/debtOutlook';
  import type { BalanceFlags, EntryType } from '$lib/parser/types';
  import CardAsk from './CardAsk.svelte';
  import { fmt } from '$lib/formatters/fmt';
  import { everyUnit, readWhenForm, writeWhenForm, type RepeatKind, type WhenForm } from '$lib/parser/whenForm';

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
  let menuFor: number | null = null;
  let whenForm: WhenForm = readWhenForm('');

  const quietFlags: BalanceFlags = {
    below: { negative: 0, low: 0, uncomfortable: 0 },
    above: { goal: 0 },
  };

  function asNumber(value: number | string | undefined): number | undefined {
    if (value === undefined || (value as unknown) === '') return undefined;
    const number = +value;
    return Number.isNaN(number) ? undefined : number;
  }

  function lookAhead(line: SourceLine): DebtOutlook | null {
    const key = (line.accountSuffix || line.extras.accountSlot || '').toUpperCase();
    if (!key) return null;
    const extras = {
      ...line.extras,
      startingBal: asNumber(line.extras.startingBal),
      apr: asNumber(line.extras.apr),
      minRate: asNumber(line.extras.minRate),
    };
    const preview = replaceSourceLine(raw, line.index, writeSourceLine({ ...line, extras }));
    const settings = $settingsStore;
    const [entries] = parseEntries(preview, settings.monthsToForecast, quietFlags, {
      useFederalHolidays: settings.useFederalHolidays,
      balanceIncludesSameDay: settings.balanceIncludesSameDay,
    });
    return debtOutlook(entries?.[key] ?? [], new Date());
  }

  $: outlookKey = draft
    ? [
        draft.type,
        draft.accountSuffix,
        draft.extras.accountSlot,
        draft.when,
        draft.amount,
        draft.extras.strategy,
        draft.extras.startingBal,
        draft.extras.apr,
        draft.extras.minRate,
        draft.extras.apr2,
        draft.extras.apr2Date,
        $settingsStore.monthsToForecast,
        $settingsStore.useFederalHolidays,
        $settingsStore.balanceIncludesSameDay,
      ].join('|')
    : '';
  $: outlook = outlookKey && draft && showsDebtFields(draft) ? lookAhead(draft) : null;

  $: lines = readSourceLines(raw);
  $: entries = lines.filter((line) => line.kind === 'entry');
  $: visible = entries.filter((line) => {
    if (typeFilter !== 'all' && line.type !== typeFilter) return false;
    if (groupFilter === 'all') return true;
    if (line.type === 'B') return false;
    const id = line.extras.categoryId || UNFILED_ID;
    return id === groupFilter;
  });
  $: unfiledCount = entries.filter(
    (line) => line.type !== 'B' && (!line.extras.categoryId || line.extras.categoryId === UNFILED_ID),
  ).length;

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
    whenForm = readWhenForm(line.when);
    menuFor = null;
    error = '';
  }

  function pickType(next: EntryType) {
    if (!draft || draft.type === next) return;
    draft.type = next;
    onTypeChange();
  }

  function pickRepeat(next: RepeatKind) {
    if (whenForm.repeat === next) return;
    whenForm.repeat = next;
    onWhenChange();
  }

  function onWhenChange() {
    if (!draft || whenForm.raw) return;
    if (draft.type === 'B') {
      whenForm.repeat = 'once';
      whenForm.lastDay = false;
      whenForm.shift = '';
      whenForm.times = '';
      whenForm.end = '';
    } else if (whenForm.repeat !== 'once' && whenForm.repeat !== 'M') {
      whenForm.lastDay = false;
    }
    draft.when = writeWhenForm(whenForm);
  }

  function onTypeChange() {
    if (!draft) return;
    if (draft.type !== 'D') {
      draft.extras.strategy = undefined;
      draft.extras.minRate = undefined;
      draft.extras.payUrl = undefined;
      draft.extras.autopay = undefined;
    }
    if (draft.type === 'B') draft.extras.categoryId = undefined;
    onWhenChange();
  }

  function showsDebtFields(line: SourceLine | null): boolean {
    if (!line || line.type !== 'D') return false;
    const sized = line.extras.strategy === 'min' || line.extras.strategy === 'pct';
    return Boolean(
      (line.accountSuffix && !line.isMain) ||
        line.extras.accountSlot ||
        line.extras.startingBal !== undefined ||
        line.extras.apr !== undefined ||
        line.extras.payUrl ||
        line.extras.autopay !== undefined ||
        sized,
    );
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
    draft.extras.startingBal = asNumber(draft.extras.startingBal);
    draft.extras.apr = asNumber(draft.extras.apr);
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
    if (event.key !== 'Escape') return;
    if (draft) close();
    else menuFor = null;
  }

  function toggleMenu(index: number) {
    menuFor = menuFor === index ? null : index;
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

  function dueDay(form: WhenForm): string {
    const day = Number((form.date || '').split('-')[2]);
    if (!day || (form.repeat !== 'once' && form.repeat !== 'M')) return '';
    return `Due on day ${day}.`;
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

<svelte:window on:keydown={onKey} on:click={() => (menuFor = null)} />

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
      <li class="type-{line.type.toLowerCase()}" class:disabled={line.disabled} class:menu-open={menuFor === line.index}>
        <span class="sheen" aria-hidden="true"></span>
        <button type="button" class="body" on:click={() => open(line)}>
          <span class="chip">{line.type}</span>
          <span class="desc">{line.desc || 'Untitled'}</span>
          <span class="meta">
            {whenLabel(line.when)}
            {#if line.type !== 'B'}
              · {categoryName(line.extras.categoryId, categories)}
            {/if}
            {#if line.extras.startingBal !== undefined}
              · starts at {fmt.curr(line.extras.startingBal)}
            {/if}
          </span>
          <span class="amount">{fmt.curr(+line.amount || 0)}</span>
        </button>
        <button
          type="button"
          class="kebab-btn"
          aria-label="Entry actions"
          aria-expanded={menuFor === line.index}
          aria-haspopup="menu"
          on:click|stopPropagation={() => toggleMenu(line.index)}
        >
          <span></span><span></span><span></span>
        </button>
        {#if menuFor === line.index}
          <div class="menu" role="menu" on:click|stopPropagation>
            <button type="button" role="menuitem" on:click={() => open(line)}>Edit</button>
            <button type="button" role="menuitem" on:click={() => { menuFor = null; clone(line); }}>Clone</button>
            <button type="button" role="menuitem" on:click={() => { menuFor = null; disable(line); }}>{line.disabled ? 'Enable' : 'Delete'}</button>
            <button type="button" role="menuitem" class="danger" on:click={() => { menuFor = null; removeIndex = line.index; }}>Hard delete</button>
          </div>
        {/if}
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
    <div class="editor-body">
    {#if error}<p class="error">{error}</p>{/if}
    <fieldset class="group">
      <div class="pair">
        <div>
          <span class="field-label" id="entry-type-label">Type</span>
          <div class="choice" role="radiogroup" aria-labelledby="entry-type-label">
            {#each [
              ['B', 'Balance'],
              ['C', 'Money in'],
              ['D', 'Money out'],
            ] as [id, label]}
              <button
                type="button"
                role="radio"
                aria-checked={draft.type === id}
                class:selected={draft.type === id}
                on:click={() => pickType(id as EntryType)}
              >{label}</button>
            {/each}
          </div>
        </div>
        {#if whenForm.raw}
          <label>When <input bind:value={draft.when} /></label>
        {:else}
          <label>Date
            <input type="date" bind:value={whenForm.date} on:change={onWhenChange} />
          </label>
        {/if}
      </div>
      {#if draft.type === 'B'}
        <label>Amount <input bind:value={draft.amount} inputmode="decimal" /></label>
      {:else}
        <div class="pair">
          <label>Amount <input bind:value={draft.amount} inputmode="decimal" /></label>
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
        </div>
      {/if}
      <label>Description <input bind:value={draft.desc} /></label>
      <label>Notes <textarea rows="2" bind:value={draft.extras.notes}></textarea></label>
    </fieldset>
    {#if !whenForm.raw && draft.type !== 'B'}
      <fieldset class="group">
        <p class="group-title">When</p>
        <div>
          <span class="field-label" id="entry-repeat-label">Repeats</span>
          <div class="choice" role="radiogroup" aria-labelledby="entry-repeat-label">
            {#each [
              ['once', 'Once'],
              ['D', 'Daily'],
              ['W', 'Weekly'],
              ['M', 'Monthly'],
              ['Y', 'Yearly'],
            ] as [id, label]}
              <button
                type="button"
                role="radio"
                aria-checked={whenForm.repeat === id}
                class:selected={whenForm.repeat === id}
                on:click={() => pickRepeat(id as RepeatKind)}
              >{label}</button>
            {/each}
          </div>
        </div>
        {#if whenForm.repeat !== 'once'}
          <div class="when-row">
            <label>Every
              <span class="every">
                <input type="number" min="1" bind:value={whenForm.every} on:change={onWhenChange} />
                {everyUnit(whenForm)}
              </span>
            </label>
          </div>
        {/if}
        {#if whenForm.repeat === 'once' || whenForm.repeat === 'M'}
          <label class="check">
            <input type="checkbox" bind:checked={whenForm.lastDay} on:change={onWhenChange} />
            Last day of the month
          </label>
        {/if}
        {#if whenForm.repeat !== 'once'}
          <div class="when-row">
            <label>Times
              <input type="number" min="1" placeholder="No limit" bind:value={whenForm.times} on:change={onWhenChange} />
            </label>
            <label>End
              <input type="date" bind:value={whenForm.end} on:change={onWhenChange} />
            </label>
            <label>Weekend
              <select bind:value={whenForm.shift} on:change={onWhenChange}>
                <option value="">Keep date</option>
                <option value="<">Previous weekday</option>
                <option value=">">Next weekday</option>
              </select>
            </label>
          </div>
        {/if}
      </fieldset>
    {/if}
    {#if showsDebtFields(draft)}
      <fieldset class="group">
        <p class="group-title">Payment</p>
      <div class="pair">
        <label>Payment style
          <select bind:value={draft.extras.strategy}>
            <option value={undefined}>Scheduled amount</option>
            <option value="fixed">Fixed amount</option>
            <option value="min">Minimum rate</option>
            <option value="pct">Percent of balance</option>
          </select>
        </label>
        {#if draft.extras.strategy === 'min'}
          <label>Minimum rate <input bind:value={draft.extras.minRate} placeholder="0.10 = 10%" /></label>
        {/if}
      </div>
      <label>Pay link <input bind:value={draft.extras.payUrl} placeholder="https://" /></label>
      <div class="pair">
        <label>Starting balance <input bind:value={draft.extras.startingBal} inputmode="decimal" /></label>
        <label>APR <input bind:value={draft.extras.apr} inputmode="decimal" placeholder="percent" /></label>
      </div>
      {#if draft.extras.apr2 !== undefined || draft.extras.apr2Date}
        <p class="hint-line">
          Next APR {draft.extras.apr2 ?? '—'}%{#if draft.extras.apr2Date} from {draft.extras.apr2Date}{/if}
        </p>
      {/if}
      {#if outlook}
        <p class="hint-line">
          {#if outlook.payoffDate}
            Paid off {fmt.date(outlook.payoffDate)}
            {#if outlook.months === 0}
              · this month
            {:else}
              · {outlook.months} {outlook.months === 1 ? 'month' : 'months'}
            {/if}
          {:else}
            Still open after this forecast
          {/if}
          · {fmt.curr(outlook.interest)} interest
        </p>
        <p class="hint-line">
          {dueDay(whenForm)} Monthly APR/12, not a lender payoff quote.
        </p>
        <details class="history">
          <summary>Payments ({outlook.payments.length})</summary>
          <ul>
            {#each outlook.payments as payment}
              <li>
                {fmt.date(payment.date)}
                · {fmt.curr(payment.amount)}
                {#if payment.interest}· interest {fmt.curr(payment.interest)}{/if}
                · left {fmt.curr(payment.remaining)}
                {#if payment.paidOff}· paid off{/if}
                {#if payment.overridden}· override{/if}
                {#if payment.pending}· pending{/if}
              </li>
            {/each}
          </ul>
        </details>
      {/if}
      <label class="check">
        <input
          type="checkbox"
          checked={!!draft.extras.autopay}
          on:change={(event) => setAutopay(event.currentTarget.checked)}
        />
        Autopay
      </label>
      </fieldset>
    {/if}
    <CardAsk raw={raw} line={draft} settings={$settingsStore} />
    </div>
    <footer class="editor-foot">
      <button type="submit" class="button-action">Save and close</button>
    </footer>
  </form>
{/if}

{#if removeIndex !== null}
  <div class="backdrop" role="presentation" on:click={() => (removeIndex = null)}></div>
  <div class="editor confirm" role="dialog" aria-label="Remove line">
    <p>Hard delete removes this line. Delete keeps it in the file and turns it off.</p>
    <button type="button" on:click={() => (removeIndex = null)}>Cancel</button>
    <button type="button" class="danger" on:click={confirmRemove}>Hard delete</button>
  </div>
{/if}

<style lang="scss">
  @use '../scss/colors' as *;

  .cards {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    min-height: 0;
    text-align: left;
  }
  .command {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: end;
    margin-bottom: 0.75rem;
    flex: none;
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
  .list {
    list-style: none;
    margin: 0;
    padding: 0.25rem 0.35rem 0.5rem;
    scrollbar-gutter: stable;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    flex: 1;
    min-width: 0;
    min-height: 0;
    overflow-x: hidden;
    overflow-y: auto;
  }
  li {
    position: relative;
    display: flex;
    gap: 0.35rem;
    align-items: stretch;
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    border: 1px solid $clr-border;
    border-radius: 0.4rem;
    background: #fff;
    transition: background-color 0.25s ease, border-color 0.3s ease, box-shadow 0.45s ease;

    &.type-b { background: #e8eef6; }
    &.type-c { background: #e7f5e8; }
    &.type-d { background: #f8efe8; }
    &.disabled { opacity: 0.55; }
    &.menu-open { z-index: 4; }

    &:hover {
      border-color: $clr-gold;
      box-shadow: 0 0 12px rgba(196, 163, 90, 0.22);

      &.type-b { background: #d5e1f0; }
      &.type-c { background: #d2ead4; }
      &.type-d { background: #f0e0d4; }

      &::after { border-color: $clr-gold; }

      .sheen::before {
        animation: card-sheen 0.9s ease;
      }
    }

    &:focus-within::after {
      border-color: $clr-text;
      inset: 0;
    }

    &::after {
      content: '';
      position: absolute;
      inset: 1px;
      border: 1px solid transparent;
      border-radius: inherit;
      pointer-events: none;
      z-index: 2;
    }
  }
  .sheen {
    position: absolute;
    inset: 0;
    overflow: hidden;
    border-radius: inherit;
    pointer-events: none;
    z-index: 0;

    &::before {
      content: '';
      position: absolute;
      inset: -20% -40%;
      background: linear-gradient(
        105deg,
        transparent 40%,
        rgba(255, 255, 255, 0.2) 48%,
        rgba(255, 255, 255, 0.55) 50%,
        rgba(255, 255, 255, 0.2) 54%,
        transparent 62%
      );
      transform: translateX(-80%);
    }
  }
  .body,
  .kebab-btn {
    position: relative;
    z-index: 1;

    &:focus,
    &:focus-visible { outline: none; }
  }
  .body {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 0.65rem;
    text-align: left;
    border: 0;
    background: transparent;
    padding: 0.35rem 0.55rem 0.35rem 0.7rem;
    cursor: pointer;
  }
  .desc {
    flex: 0 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 650;
  }
  .meta {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: $clr-muted;
    font-size: 0.82rem;
  }
  .hint-line { margin: 0; color: $clr-muted; font-size: 0.85rem; }
  .history {
    font-size: 0.82rem;
    color: $clr-muted;

    summary { cursor: pointer; }
    ul { margin: 0.25rem 0 0; padding-left: 1.1rem; }
  }

  @keyframes card-sheen {
    from { transform: translateX(-80%); }
    to { transform: translateX(80%); }
  }

  @media (prefers-reduced-motion: reduce) {
    li,
    .body {
      transition: none;
    }

    .sheen::before {
      display: none;
    }
  }
  .chip { flex: none; font-weight: 700; color: $clr-accent-ink; }
  .amount { flex: none; margin-left: auto; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .kebab-btn {
    align-self: center;
    flex: none;
    width: 2.25rem;
    height: 2.25rem;
    margin-right: 0.35rem;
    border: 0;
    border-radius: 0.35rem;
    background: transparent;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    cursor: pointer;

    span {
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: $clr-text;
    }

    &:hover,
    &[aria-expanded='true'] {
      background: rgba(28, 33, 28, 0.08);
    }
  }
  .menu {
    position: absolute;
    z-index: 5;
    top: 2.5rem;
    right: 0.35rem;
    min-width: 9.5rem;
    padding: 0.3rem;
    background: #fff;
    border: 1px solid $clr-border;
    border-radius: 0.4rem;
    box-shadow: 0 8px 22px rgba(28, 33, 28, 0.16);
    display: flex;
    flex-direction: column;
    gap: 0.15rem;

    button {
      border: 0;
      background: transparent;
      border-radius: 0.3rem;
      padding: 0.45rem 0.6rem;
      text-align: left;
      cursor: pointer;

      &:hover { background: $clr-accent-soft; }
    }
  }
  .editor .group {
    margin: 0;
    padding: 0.45rem 0.65rem 0.55rem;
    box-shadow: none;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .group-title {
    margin: 0;
    padding: 0;
    font-size: 0.78rem;
    font-weight: 700;
    line-height: 1.1;
    color: $clr-accent-ink;
  }
  .when-row {
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1fr);
    gap: 0.45rem 0.55rem;
    align-items: end;

    input, select { width: 100%; min-width: 0; box-sizing: border-box; }
  }
  .every {
    display: flex;
    align-items: center;
    gap: 0.35rem;

    input { width: 3.4rem; }
  }
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
    width: min(38rem, calc(100% - 1.5rem));
    max-height: 84vh;
    overflow: hidden;
    background: #fff;
    border-radius: 0.5rem;
    padding: 0;
    display: flex;
    flex-direction: column;
    text-align: left;
  }
  .editor header,
  .editor-foot {
    flex: none;
    display: flex;
    align-items: center;
    padding: 0.7rem 1rem;
    background: #fff;
  }
  .editor header { justify-content: space-between; border-bottom: 1px solid $clr-border; }
  .editor-foot { justify-content: center; border-top: 1px solid $clr-border; }
  .editor-body {
    overflow: auto;
    padding: 0.7rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }
  .editor .choice {
    display: flex;
    flex-wrap: nowrap;
    gap: 0;

    button {
      flex: 1 1 0;
      min-width: 0;
      margin: 0;
      padding: 0.3rem 0.35rem;
      border-radius: 0;
      font-size: 0.82rem;
      position: relative;

      & + button { margin-left: -1px; }
      &:first-child { border-radius: 0.35rem 0 0 0.35rem; }
      &:last-child { border-radius: 0 0.35rem 0.35rem 0; }
    }

    button.selected {
      z-index: 1;
      background: $clr-accent-soft;
      font-weight: 700;
    }
  }
  .field-label {
    display: block;
    margin-bottom: 0.2rem;
    font-size: 0.85rem;
  }
  .pair {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 0.5rem 0.7rem;
  }
  .editor h3 { margin: 0; }
  .editor label { display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.85rem; }
  .editor input, .editor select, .editor textarea { font: inherit; padding: 0.35rem 0.45rem; width: 100%; box-sizing: border-box; }
  .editor textarea { resize: vertical; min-height: 3.2rem; }
  .editor label.check {
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    gap: 0.4rem;

    input { width: auto; padding: 0; }
  }
  .error { color: #8a1f1f; margin: 0; }
  .confirm { gap: 0.6rem; padding: 0.9rem 1rem; overflow: auto; }
</style>
