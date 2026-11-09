<script lang="ts">
  import { SvelteMap } from 'svelte/reactivity';
  import CategoryIcon from './CategoryIcon.svelte';
  import Icon from './Icon.svelte';
  import BulkPayments from './BulkPayments.svelte';
  import { entrySetsStore } from '#lib/data/entrySets.ts';
  let bulkOpen = false;
  import EntryWhen from './EntryWhen.svelte';
  import { modal } from '#lib/ui/modal.ts';
  import { tick } from 'svelte';
  import { categoryName, type Category, UNFILED_ID } from '#lib/data/categories.ts';
  import { localIsoDate } from '#lib/formatters/dates.ts';
  import { isHttpUrl, latestDated } from '#lib/parser/lineExtras.ts';
  import {
    insertSourceLine,
    readSourceLine,
    readSourceLines,
    removeSourceLine,
    replaceSourceLine,
    writeSourceLine,
    type SourceLine,
  } from '#lib/parser/sourceLines.ts';
  import { settingsStore } from '#lib/stores/settings.ts';
  import { parseEntries } from '#lib/parser/parseEntries.ts';
  import { debtOutlook, type DebtOutlook } from '#lib/parser/debtOutlook.ts';
  import { ensureDebtAccount } from '#lib/parser/debtAccount.ts';
  import type { BalanceFlags, EntryType } from '#lib/parser/types.ts';
  import CardAsk from './CardAsk.svelte';
  import { fmt } from '#lib/formatters/fmt.ts';
  import { evaluateAmount } from '#lib/parser/amountExpr.ts';
  import { applyForecastEdit } from '#lib/parser/occurrenceEdit.ts';
  import { parseRecur } from '#lib/parser/recurrence.ts';
  import type { DebtPayment } from '#lib/parser/debtOutlook.ts';
  import type { ParsedEntry } from '#lib/parser/types.ts';
  import { readWhenForm, writeWhenForm, type WhenForm } from '#lib/parser/whenForm.ts';

  export let raw = '';
  export let categories: Category[] = [];
  export let onCommit: (next: string) => void = () => {};
  /** Source line to open once. Parent clears it from onOpenLine. */
  export let openLine: number | null = null;
  export let onOpenLine: () => void = () => {};

  let typeFilter: 'all' | 'C' | 'D' = 'all';
  let groupFilter = 'all';

  let draft: SourceLine | null = null;
  let openedSerialized = '';
  let openedHadAutopay = false;
  let error = '';
  let removeIndex: number | null = null;
  let pickingCategory = false;
  let groupSelect: HTMLSelectElement;
  let menuTrigger: HTMLButtonElement;
  let menuFor: number | null = null;
  let whenForm: WhenForm = readWhenForm('');
  let consumedOpen: number | null = null;
  let editorTab: 'entry' | 'when' | 'payment' | 'ask' = 'entry';
  let extraDraft = 0;
  let editingOccurrence: number | null = null;
  let occurrenceDate = '';
  let occurrenceAmount = '';

  const quietFlags: BalanceFlags = {
    below: { negative: 0, low: 0, uncomfortable: 0 },
    above: { goal: 0 },
  };

  function asNumber(value: number | string | undefined): number | undefined {
    if (value === undefined || (value as unknown) === '') return undefined;
    const number = +value;
    return Number.isNaN(number) ? undefined : number;
  }

  function lookAhead(line: SourceLine, extra = extraDraft): DebtOutlook | null {
    const key = ensureDebtAccount(line);
    if (!key) return null;
    const extras = {
      ...line.extras,
      startingBal: asNumber(line.extras.startingBal),
      apr: asNumber(line.extras.apr),
      minRate: asNumber(line.extras.minRate),
      extraPayment: extra > 0 ? extra : undefined,
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
        extraDraft,
        $settingsStore.monthsToForecast,
        $settingsStore.useFederalHolidays,
        $settingsStore.balanceIncludesSameDay,
      ].join('|')
    : '';
  $: showWhen = !!draft && !whenForm.raw && draft.type !== 'B';
  $: showPayment = showsDebtFields(draft);
  $: balanceStart = (lines.find((line) => line.kind === 'entry' && line.type === 'B')?.when ?? '').slice(0, 10);
  $: seriesIsEarly = !!(draft && /,R/i.test(draft.when) && /^\d{4}-\d{2}-\d{2}$/.test(balanceStart) && draft.when.slice(0, 10) < balanceStart);
  $: outlook = outlookKey && draft && showPayment ? lookAhead(draft, extraDraft) : null;
  $: baselineOutlook = outlookKey && draft && showPayment ? lookAhead(draft, draft.extras.extraPayment ?? 0) : null;
  $: if (editorTab === 'when' && !showWhen) editorTab = 'entry';
  $: if (editorTab === 'payment' && !showPayment) editorTab = 'entry';

  $: lines = readSourceLines(raw);
  $: if (openLine === null) {
    consumedOpen = null;
  } else if (openLine !== consumedOpen) {
    consumedOpen = openLine;
    const requested = lines.find((item) => item.kind === 'entry' && item.index === openLine);
    if (requested) open(requested);
    onOpenLine();
  }
  $: entries = lines.filter((line) => line.kind === 'entry');
  $: typeEntries = entries.filter((line) => typeFilter === 'all' || line.type === typeFilter);
  function groupOf(line: SourceLine) {
    return line.type === 'B' ? null : line.extras.categoryId || UNFILED_ID;
  }
  function countGroups(rows: SourceLine[]) {
    const counts = new SvelteMap<string, number>();
    for (const row of rows) {
      const group = groupOf(row);
      if (group !== null) counts.set(group, (counts.get(group) ?? 0) + 1);
    }
    return counts;
  }
  $: groupCounts = countGroups(typeEntries);
  $: visible = groupFilter === 'all' ? typeEntries : typeEntries.filter((line) => groupOf(line) === groupFilter);

  function commit(next: string) {
    if (next === raw) return;
    onCommit(next);
  }

  function open(line: SourceLine) {
    draft = {
      ...line,
      extras: { ...line.extras, unknown: [...line.extras.unknown] },
      overrides: { ...line.overrides },
    };
    openedSerialized = writeSourceLine(draft);
    openedHadAutopay = line.extras.autopay !== undefined;
    whenForm = readWhenForm(line.when);
    extraDraft = line.extras.extraPayment ?? 0;
    editingOccurrence = null;
    menuFor = null;
    error = '';
    editorTab = 'entry';
  }

  function addEntry() {
    const main = entries.find((line) => !line.disabled && line.type === 'B' && line.isMain);
    const type = typeFilter !== 'all' ? typeFilter : !main && groupFilter === 'all' ? 'B' : 'D';
    const line = readSourceLine(type + '|' + localIsoDate() + '||', -1);
    if (type !== 'B' && groupFilter !== 'all' && groupFilter !== UNFILED_ID) line.extras.categoryId = groupFilter;
    open(line);
  }

  function dismiss() {
    if (draft?.index === -1) {
      draft = null;
      error = '';
    } else close();
  }

  function pickType(next: EntryType) {
    if (!draft || draft.type === next) return;
    draft.type = next;
    onTypeChange();
  }

  function onWhenChange() {
    if (!draft || whenForm.raw) return;
    if (draft.type === 'B') {
      whenForm.repeat = 'once';
      whenForm.lastDay = false;
      whenForm.shift = '';
      whenForm.times = '';
      whenForm.end = '';
    } else if (whenForm.repeat !== 'M') {
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
      (line.extras.extraPayment ?? 0) > 0 ||
      sized,
    );
  }

  function close() {
    if (!draft) {
      return;
    }
    const creating = draft.index === -1;
    if (creating && (!draft.desc.trim() || !draft.amount.trim() || !whenForm.date)) {
      error = 'Enter a description, date, and amount.';
      return;
    }
    if (creating && /[|\r\n]/.test(draft.desc + (draft.extras.notes ?? ''))) {
      error = 'Use a single line without a | in the description and notes.';
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
    const amountValue = evaluateAmount(String(draft.amount));
    if (amountValue === null) {
      error = 'Amount must be a number, or arithmetic like 1000+250.';
      return;
    }
    draft.amount = String(Math.round(amountValue * 100) / 100);
    draft.extras.startingBal = asNumber(draft.extras.startingBal);
    draft.extras.apr = asNumber(draft.extras.apr);
    if (!draft.extras.categoryId) draft.extras.categoryId = undefined;
    if (creating && draft.type === 'B') {
      draft.accountSuffix = entries.find((line) => !line.disabled && line.type === 'B' && line.isMain)?.accountSuffix || 'CHCK';
      draft.isMain = true;
    }
    const nextLine = writeSourceLine(draft);
    if (creating) {
      if (typeFilter !== 'all' && typeFilter !== draft.type) typeFilter = 'all';
      if (groupFilter !== 'all' && (draft.type === 'B' || groupFilter !== (draft.extras.categoryId || UNFILED_ID))) groupFilter = 'all';
      commit(raw + (raw && !raw.endsWith('\n') ? '\n' : '') + nextLine);
      draft = null;
      return;
    }
    const index = draft.index;
    const unchanged = nextLine === openedSerialized;

    draft = null;
    error = '';
    if (!unchanged) commit(replaceSourceLine(raw, index, nextLine));
  }

  function onKey(event: KeyboardEvent) {
    if (event.key !== 'Escape') return;
    if (draft) dismiss();
    else menuFor = null;
  }

  async function toggleMenu(index: number, trigger: HTMLButtonElement) {
    menuTrigger = trigger;
    pickingCategory = false;
    menuFor = menuFor === index ? null : index;
    if (menuFor === null) return;
    await tick();
    document.querySelector<HTMLButtonElement>('.cards .menu [role="menuitem"]')?.focus();
  }

  let categoryTrigger: HTMLButtonElement;
  let flyoutLeft = false;
  function placeFlyout(node: HTMLDivElement) {
    node.showPopover();
    function place() {
      const r = categoryTrigger.getBoundingClientRect(),
        panel = node.getBoundingClientRect();
      flyoutLeft = innerWidth - r.right < panel.width && r.left > innerWidth - r.right;
      const x = flyoutLeft ? r.left - panel.width + 1 : r.right - 1;
      node.style.left = Math.max(4, Math.min(x, innerWidth - panel.width - 4)) + 'px';
      node.style.top = Math.max(4, Math.min(r.top, innerHeight - panel.height - 4)) + 'px';
    }
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return {
      destroy() {
        window.removeEventListener('resize', place);
        window.removeEventListener('scroll', place, true);
      },
    };
  }
  async function showCategories(focus = false) {
    pickingCategory = true;
    await tick();
    if (focus)
      (
        document.querySelector<HTMLButtonElement>('.category-flyout [aria-checked="true"]') ??
        document.querySelector<HTMLButtonElement>('.category-flyout button')
      )?.focus();
  }
  async function closeMenu() {
    menuFor = null;
    await tick();
    (menuTrigger?.isConnected ? menuTrigger : groupSelect)?.focus();
  }
  function assignCategory(line: SourceLine, id: string) {
    if ((line.extras.categoryId || UNFILED_ID) !== id) {
      const updated = { ...line, extras: { ...line.extras, categoryId: id === UNFILED_ID ? undefined : id } };
      commit(replaceSourceLine(raw, line.index, writeSourceLine(updated)));
    }
    void closeMenu();
  }
  function onMenuKey(event: KeyboardEvent) {
    const items = [...(event.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>('button')].filter(
      (item) => item.closest('[role=menu]') === event.currentTarget,
    );
    const index = items.findIndex((item) => item === document.activeElement);
    const inside = (event.currentTarget as HTMLElement).classList.contains('category-flyout');
    if (inside && (event.key === 'ArrowLeft' || event.key === 'Escape')) {
      event.preventDefault();
      event.stopPropagation();
      pickingCategory = false;
      categoryTrigger.focus();
      return;
    }
    if (!inside && event.target === categoryTrigger && event.key === 'ArrowRight') {
      event.preventDefault();
      void showCategories(true);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      void closeMenu();
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      items[(index + step + items.length) % items.length]?.focus();
    } else if (event.key === 'Home') {
      event.preventDefault();
      items[0]?.focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      items.at(-1)?.focus();
    }
  }

  function onFilterKey(event: KeyboardEvent) {
    const buttons = [...(event.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>('button')];
    const index = buttons.findIndex((item) => item === document.activeElement);
    if (index < 0 || (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft')) return;
    event.preventDefault();
    const step = event.key === 'ArrowRight' ? 1 : -1;
    const next = buttons[(index + step + buttons.length) % buttons.length];
    next?.focus();
    next?.click();
  }

  function extraCap(line: SourceLine): number {
    const balance = asNumber(line.extras.startingBal) ?? 0;
    const payment = Math.abs(+line.amount || 0);
    const doubled = payment > 0 ? payment * 2 : 100;
    return balance > 0 ? Math.max(1, Math.min(balance, doubled)) : doubled;
  }

  function applyExtra() {
    if (!draft) return;
    draft.extras.extraPayment = extraDraft > 0 ? extraDraft : undefined;
  }

  function startOccurrence(payment: DebtPayment) {
    editingOccurrence = payment.occurrenceIndex;
    occurrenceDate = localIsoDate(payment.date);
    occurrenceAmount = String(payment.amount);
  }

  function saveOccurrence(payment: DebtPayment) {
    const stub = {
      entryOrder: payment.entryOrder,
      rawEntry: payment.rawEntry,
      recur: payment.recurring ? { freq: 'M', multiple: 1, count: null, recurRaw: 'R' } : null,
      date: payment.date,
      amount: payment.amount,
      seriesDate: payment.seriesDate,
      baseAmount: payment.baseAmount,
      occurrenceIndex: payment.occurrenceIndex,
      pending: payment.pending,
    } as ParsedEntry;
    commit(
      applyForecastEdit(raw, stub, {
        date: occurrenceDate,
        amount: +occurrenceAmount,
        scope: 'occurrence',
      }),
    );
    editingOccurrence = null;
  }

  function setAutopay(checked: boolean) {
    if (!draft) return;
    if (checked) draft.extras.autopay = true;
    else draft.extras.autopay = openedHadAutopay ? false : undefined;
  }

  function toggleEnabled(line: SourceLine) {
    const next = line.disabled ? line.raw.replace(/^(\s*)[!#]/, '$1') : line.raw.replace(/^(\s*)/, '$1!');
    commit(replaceSourceLine(raw, line.index, next));
  }

  function clone(line: SourceLine) {
    const copy = writeSourceLine({ ...line, disabled: false });
    commit(insertSourceLine(raw, line.index, copy));
  }

  function confirmRemove() {
    if (removeIndex === null) return;
    commit(removeSourceLine(raw, removeIndex));
    removeIndex = null;

    draft = null;
  }

  function dueDay(form: WhenForm): string {
    const day = Number((form.date || '').split('-')[2]);
    if (!day || (form.repeat !== 'once' && form.repeat !== 'M')) return '';
    return `Due on day ${day}.`;
  }

  function whenLabel(when: string): string {
    const [date, token = ''] = when.split(',');
    const shift =
      token.includes('<') || date?.includes('<') ? ' · prior business day' : token.includes('>') || date?.includes('>') ? ' · next business day' : '';
    const day = (date ?? '').replace(/[<>]/g, '') || 'No date';
    const recur = token.replace(/[<>]/g, '');
    if (!recur) return `${day}${shift}`;
    return `${day} · ${cadence(recur)}${shift}`;
  }

  function cadence(recur: string): string {
    const parsed = parseRecur(recur);
    if (!parsed) return recur.replace(/^R/, '');
    const once = { D: 'daily', W: 'weekly', M: 'monthly', Y: 'yearly' }[parsed.freq];
    const many = { D: 'days', W: 'weeks', M: 'months', Y: 'years' }[parsed.freq];
    const every = parsed.multiple === 1 ? once : `every ${parsed.multiple} ${many}`;
    const last = parsed.lastDayOfMonth ? ', last day' : '';
    const times = parsed.count ? `, ${parsed.count} times` : '';
    return `${every}${last}${times}`;
  }
</script>

<svelte:window on:keydown={onKey} on:click={() => (menuFor = null)} />

<div class="cards">
  <div class="command">
    <slot />
    <div class="segments" role="toolbar" tabindex="-1" aria-label="Entry type" on:keydown={onFilterKey}>
      {#each [['all', 'All', entries.length], ['C', 'Credits', entries.filter((line) => line.type === 'C').length], ['D', 'Debits', entries.filter((line) => line.type === 'D').length]] as [id, label, count] (id)}
        <button type="button" aria-pressed={typeFilter === id} class:selected={typeFilter === id} on:click={() => (typeFilter = id as typeof typeFilter)}>
          {label} ({count})
        </button>
      {/each}
    </div>
    <label>
      <CategoryIcon id={groupFilter} /> Group
      <select bind:this={groupSelect} bind:value={groupFilter}>
        <option value="all">All groups{typeEntries.length ? ` (${typeEntries.length})` : ''}</option>
        {#each categories as category (category)}
          <option value={category.id}>
            {category.name}{groupCounts.has(category.id) ? ` (${groupCounts.get(category.id)})` : ''}
          </option>
        {/each}
      </select>
    </label>
    <button type="button" class="bulk-button" on:click={() => (bulkOpen = true)}>Bulk update</button>
    <button type="button" class="add-entry" on:click={addEntry}>Add entry</button>
  </div>

  <ul class="list">
    {#each visible as line (line.index)}
      {@const typeLabel = line.type === 'B' ? 'Balance' : line.type === 'C' ? 'Credit' : 'Debit'}
      {@const categoryLabel = line.type === 'B' ? 'Balance' : categoryName(line.extras.categoryId, categories)}
      {@const snapshot = latestDated(line.extras.dated, 'debt', localIsoDate())}
      {@const payment = latestDated(line.extras.dated, 'pay', localIsoDate())?.value ?? (+line.amount || 0)}
      <li class="type-{line.type.toLowerCase()}" class:disabled={line.disabled} class:menu-open={menuFor === line.index}>
        <span class="sheen" aria-hidden="true"></span>
        <button type="button" class="body" title={line.type === 'B' ? typeLabel : typeLabel + ' · ' + categoryLabel} on:click={() => open(line)}>
          <span class="type-for-reader">{typeLabel}{line.type === 'B' ? '' : ' · ' + categoryLabel}:</span>
          <span class="leading-icon" aria-hidden="true"
            >{#if line.type === 'B'}<Icon name="wallet" size={24} />{:else}<CategoryIcon id={line.extras.categoryId} size={24} />{/if}</span
          >
          <span class="desc">{line.desc || 'Untitled'}</span>
          <span class="meta">
            {whenLabel(line.when)}
            {#if snapshot}
              · {fmt.curr(snapshot.value)} owed as of {snapshot.date}
            {:else if line.extras.startingBal !== undefined}
              · starts at {fmt.curr(line.extras.startingBal)}
            {/if}
          </span>
          <span class="amount">{line.extras.strategy === 'pct' ? payment + '%' : fmt.curr(payment)}</span>
        </button>
        <div class="tile-actions">
          <button
            type="button"
            class="kebab-btn"
            aria-label="Entry actions"
            aria-expanded={menuFor === line.index}
            aria-haspopup="menu"
            on:click|stopPropagation={(event) => toggleMenu(line.index, event.currentTarget)}
          >
            <Icon name="kebab" />
          </button>
          <button
            type="button"
            class="quick-toggle"
            title={line.disabled ? 'Enable entry' : 'Disable entry'}
            aria-label={(line.disabled ? 'Enable ' : 'Disable ') + (line.desc || 'entry')}
            on:click={() => toggleEnabled(line)}><Icon name={line.disabled ? 'play' : 'pause'} size={15} /></button
          >
        </div>
        {#if menuFor === line.index}
          <div class="menu" role="menu" aria-label="Entry actions" tabindex="-1" on:click|stopPropagation on:keydown={onMenuKey}>
            <button type="button" role="menuitem" on:click={() => open(line)}><Icon name="edit" /> Edit</button>
            {#if line.type !== 'B'}
              <div
                role="presentation"
                on:pointerenter={(e) => {
                  if (e.pointerType !== 'touch') void showCategories();
                }}
                on:pointerleave={(e) => {
                  if (e.pointerType !== 'touch' && !e.currentTarget.contains(document.activeElement)) pickingCategory = false;
                }}
                on:focusout={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) pickingCategory = false;
                }}
              >
                <button
                  bind:this={categoryTrigger}
                  type="button"
                  role="menuitem"
                  aria-haspopup="menu"
                  aria-expanded={pickingCategory}
                  on:click={() => showCategories(true)}
                >
                  <Icon name="tag" /> Change category <span class="flyout-arrow" aria-hidden="true">{pickingCategory && flyoutLeft ? '◂' : '▸'}</span>
                </button>
                {#if pickingCategory}
                  <div
                    class="category-flyout"
                    popover="manual"
                    use:placeFlyout
                    role="menu"
                    aria-label="Choose category"
                    tabindex="-1"
                    on:keydown|stopPropagation={onMenuKey}
                  >
                    {#each categories as category (category.id)}
                      <button
                        type="button"
                        role="menuitemradio"
                        aria-checked={(line.extras.categoryId || UNFILED_ID) === category.id}
                        on:click={() => assignCategory(line, category.id)}
                      >
                        <CategoryIcon id={category.id} />{category.name}
                        {#if (line.extras.categoryId || UNFILED_ID) === category.id}<span class="category-check"><Icon name="check" size={14} /></span>{/if}
                      </button>
                    {/each}
                  </div>
                {/if}
              </div>
            {/if}
            <button
              type="button"
              role="menuitem"
              on:click={() => {
                menuFor = null;
                clone(line);
              }}><Icon name="clone" /> Clone</button
            >
            <button
              type="button"
              role="menuitem"
              on:click={() => {
                menuFor = null;
                toggleEnabled(line);
              }}><Icon name={line.disabled ? 'play' : 'pause'} /> {line.disabled ? 'Enable' : 'Disable'}</button
            >
            <hr />
            <button
              type="button"
              role="menuitem"
              class="danger"
              on:click={() => {
                menuFor = null;
                removeIndex = line.index;
              }}><Icon name="trash" /> Delete</button
            >
          </div>
        {/if}
      </li>
    {:else}
      <li class="empty">No entries in this filter.</li>
    {/each}
  </ul>
</div>

{#if bulkOpen}<BulkPayments
    {raw}
    {categories}
    currency={$settingsStore.currencyIsoCode}
    scenarioId={$entrySetsStore.activeId}
    initialGroup={groupFilter}
    onSave={commit}
    onClose={() => (bulkOpen = false)}
  />{/if}

{#if draft}
  <dialog class="editor" aria-label={draft.index === -1 ? 'Add entry' : 'Edit entry'} use:modal on:cancel|preventDefault={dismiss}>
    <form style="display: contents" on:submit|preventDefault={close}>
      <header>
        <h3>{draft.index === -1 ? 'Add entry' : draft.desc.trim() || 'Edit entry'}</h3>
        <button type="button" on:click={dismiss} aria-label={draft.index === -1 ? 'Cancel' : 'Close and save'}>×</button>
      </header>
      <div class="editor-tabs" role="tablist" aria-label="Entry sections">
        <button type="button" role="tab" aria-selected={editorTab === 'entry'} class:selected={editorTab === 'entry'} on:click={() => (editorTab = 'entry')}
          >Entry</button
        >
        {#if showWhen}
          <button type="button" role="tab" aria-selected={editorTab === 'when'} class:selected={editorTab === 'when'} on:click={() => (editorTab = 'when')}
            >When</button
          >
        {/if}
        {#if showPayment}
          <button
            type="button"
            role="tab"
            aria-selected={editorTab === 'payment'}
            class:selected={editorTab === 'payment'}
            on:click={() => (editorTab = 'payment')}>Payment</button
          >
        {/if}
        <button type="button" role="tab" aria-selected={editorTab === 'ask'} class:selected={editorTab === 'ask'} on:click={() => (editorTab = 'ask')}
          >Ask</button
        >
      </div>
      <div class="editor-body">
        {#if error}<p class="error">{error}</p>{/if}
        {#if editorTab === 'entry'}
          <fieldset class="group">
            <label class="desc-field">Description <input bind:value={draft.desc} /></label>
            <div class="pair">
              <div>
                <span class="field-label" id="entry-type-label">Type</span>
                <div class="choice" role="radiogroup" aria-labelledby="entry-type-label">
                  {#each [['B', 'Balance'], ['C', 'Money in'], ['D', 'Money out']] as [id, label] (id)}
                    <button
                      type="button"
                      role="radio"
                      aria-checked={draft.type === id}
                      class:selected={draft.type === id}
                      on:click={() => pickType(id as EntryType)}>{label}</button
                    >
                  {/each}
                </div>
              </div>
              {#if whenForm.raw}
                <label>When <input bind:value={draft.when} /></label>
              {:else}
                <label
                  >Date
                  <input type="date" bind:value={whenForm.date} on:change={onWhenChange} />
                </label>
              {/if}
            </div>
            {#if draft.type === 'B'}
              <label
                >{draft.extras.dated?.some((v) => v.kind === 'pay') ? 'Original payment' : 'Amount'}
                <input bind:value={draft.amount} inputmode="decimal" /></label
              >
            {:else}
              <div class="pair">
                <label>Amount <input bind:value={draft.amount} inputmode="decimal" /></label>
                <label
                  ><span><CategoryIcon id={draft.extras.categoryId} /> Category</span>
                  <select
                    value={draft.extras.categoryId ?? ''}
                    on:change={(event) => {
                      if (draft) draft.extras.categoryId = event.currentTarget.value || undefined;
                    }}
                  >
                    <option value="">Unfiled</option>
                    {#each categories.filter((category) => category.id !== UNFILED_ID) as category (category)}
                      <option value={category.id}>{category.name}</option>
                    {/each}
                  </select>
                </label>
              </div>
            {/if}
            <label>Notes <textarea rows="2" bind:value={draft.extras.notes}></textarea></label>
          </fieldset>
        {/if}
        {#if showWhen && editorTab === 'when'}
          <EntryWhen bind:whenForm {seriesIsEarly} {onWhenChange} />
        {/if}
        {#if showPayment && editorTab === 'payment'}
          <fieldset class="group">
            <div class="pair">
              <label
                >Payment style
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
                Next APR {draft.extras.apr2 ?? '—'}%{#if draft.extras.apr2Date}
                  from {draft.extras.apr2Date}{/if}
              </p>
            {/if}
            <label class="extra">
              Extra each payment
              <input type="range" min="0" max={extraCap(draft)} step="1" bind:value={extraDraft} />
              <input type="number" min="0" step="1" bind:value={extraDraft} />
            </label>
            {#if baselineOutlook && outlook && extraDraft !== (draft.extras.extraPayment ?? 0)}
              <p class="hint-line">
                Preview only.
                {#if outlook.payoffDate}
                  Paid off {fmt.date(outlook.payoffDate)}.
                {:else}
                  Still open in this forecast.
                {/if}
                {fmt.curr(Math.max(0, baselineOutlook.interest - outlook.interest))} less interest than the saved extra.
              </p>
            {/if}
            <button type="button" on:click={applyExtra}>Apply extra to this account</button>
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
                  {#each outlook.payments as payment (payment)}
                    <li>
                      {#if editingOccurrence === payment.occurrenceIndex}
                        <input type="date" bind:value={occurrenceDate} aria-label="Occurrence date" />
                        <input bind:value={occurrenceAmount} inputmode="decimal" aria-label="Occurrence amount" />
                        <button type="button" on:click={() => saveOccurrence(payment)}>Save this one</button>
                        <button type="button" on:click={() => (editingOccurrence = null)}>Cancel</button>
                      {:else}
                        {fmt.date(payment.date)}
                        · {fmt.curr(payment.amount)}
                        {#if payment.interest}· interest {fmt.curr(payment.interest)}{/if}
                        · left {fmt.curr(payment.remaining)}
                        {#if payment.paidOff}· paid off{/if}
                        {#if payment.overridden}· override{/if}
                        {#if payment.pending}· pending{/if}
                        <button type="button" on:click={() => startOccurrence(payment)}>Edit this one</button>
                      {/if}
                    </li>
                  {/each}
                </ul>
              </details>
            {/if}
            <label class="check">
              <input type="checkbox" checked={!!draft.extras.autopay} on:change={(event) => setAutopay(event.currentTarget.checked)} />
              Autopay
            </label>
          </fieldset>
        {/if}
        {#if editorTab === 'ask'}
          <CardAsk {raw} line={draft} settings={$settingsStore} />
        {/if}
      </div>
      <footer class="editor-foot">
        <button type="submit" class="button-action">{draft.index === -1 ? 'Save entry' : 'Save and close'}</button>
      </footer>
    </form>
  </dialog>
{/if}

{#if removeIndex !== null}
  <dialog
    class="delete-dialog"
    aria-labelledby="delete-entry-title"
    aria-describedby="delete-entry-description"
    use:modal
    on:cancel={() => (removeIndex = null)}
  >
    <h3 id="delete-entry-title">Delete entry?</h3>
    <p id="delete-entry-description">
      This removes <strong>{lines[removeIndex]?.desc || 'this entry'}</strong> and its scheduled occurrences from this scenario.
    </p>
    <footer>
      <button type="button" on:click={() => (removeIndex = null)}>Cancel</button>
      <button type="button" class="delete-action" on:click={confirmRemove}><Icon name="trash" /> Delete</button>
    </footer>
  </dialog>
{/if}

<style lang="scss">
  @use '../scss/colors' as *;
  @use '../scss/action-menu' as actions;

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
    gap: 0.35rem 0.75rem;
    align-items: center;
    margin-bottom: 0.4rem;
    flex: none;
  }
  .bulk-button {
    margin-left: auto;
    padding: 0.3rem 0.55rem;
    border: 1px solid #aebdaf;
    border-radius: 0.35rem;
    background: white;
    color: #163f2b;
    font-size: 0.82rem;
    cursor: pointer;
  }
  .add-entry {
    border: 1px solid #163f2b;
    border-radius: 0.35rem;
    padding: 0.3rem 0.7rem;
    background: #163f2b;
    color: white;
    font-size: 0.82rem;
    font-weight: 650;
    cursor: pointer;
  }
  .command label {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.8rem;
    margin: 0;
  }
  .command select {
    min-width: 0;
    max-width: 12rem;
    padding: 0.25rem;
    font: inherit;
  }
  .segments {
    display: flex;
    gap: 0.25rem;
  }
  .segments button,
  .kebab button,
  .editor button {
    border: 1px solid $clr-border;
    background: #fff;
    border-radius: 0.35rem;
    padding: 0.35rem 0.6rem;
    cursor: pointer;
  }
  .segments button {
    padding: 0.3rem 0.5rem;
    font-size: 0.82rem;
  }
  .segments button.selected {
    background: $clr-accent-soft;
    font-weight: 700;
  }
  .list {
    list-style: none;
    margin: 0;
    padding: 0.25rem 0.35rem 0.5rem;
    scrollbar-gutter: stable;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 15rem), 1fr));
    align-content: start;
    gap: 0.5rem;
    flex: 1;
    min-width: 0;
    min-height: 0;
    overflow-x: hidden;
    overflow-y: auto;
  }
  .empty {
    grid-column: 1 / -1;
  }
  .list > li {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-rows: auto auto;
    gap: 0 0.35rem;
    padding-block: 0.22rem;
    align-items: stretch;
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    border: 1px solid $clr-border;
    border-radius: 0.4rem;
    background: #fff;
    transition:
      background-color 0.25s ease,
      border-color 0.3s ease,
      box-shadow 0.45s ease;

    &.type-b {
      background: #e8eef6;
    }
    &.type-c {
      background: #e7f5e8;
    }
    &.type-d {
      background: #f8efe8;
    }
    &.disabled .body {
      opacity: 0.6;
    }
    &.menu-open {
      z-index: 4;
    }

    &:hover {
      border-color: $clr-gold;
      box-shadow: 0 0 12px rgba(196, 163, 90, 0.22);

      &.type-b {
        background: #d5e1f0;
      }
      &.type-c {
        background: #d2ead4;
      }
      &.type-d {
        background: #f0e0d4;
      }

      &::after {
        border-color: $clr-gold;
      }

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
    &:focus-visible {
      outline: none;
    }
  }
  .body {
    flex: 1;
    min-width: 0;
    display: grid;
    grid-column: 1;
    grid-row: 1 / span 2;
    grid-template-rows: subgrid;
    grid-template-columns: 1.5rem minmax(0, 1fr) auto;
    grid-template-areas: 'symbol name amount' 'symbol meta meta';
    align-items: center;
    gap: 0 0.45rem;
    text-align: left;
    border: 0;
    background: transparent;
    padding: 0 0 0 0.6rem;
    cursor: pointer;
  }
  .leading-icon {
    grid-area: symbol;
    display: grid;
    place-items: center;
    color: #485a4c;
  }
  .desc {
    grid-area: name;
    overflow-wrap: anywhere;
    font-weight: 650;
    line-height: 1.25;
  }
  .meta {
    grid-area: meta;
    color: $clr-muted;
    font-size: 0.78rem;
    line-height: 1.35;
    overflow-wrap: anywhere;
  }
  .hint-line {
    margin: 0;
    color: $clr-muted;
    font-size: 0.85rem;
  }
  .extra {
    display: grid;
    grid-template-columns: auto 1fr 5.5rem;
    gap: 0.45rem;
    align-items: center;
  }
  .extra input[type='number'] {
    width: 100%;
  }
  .history li {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    align-items: center;
  }
  .history {
    font-size: 0.82rem;
    color: $clr-muted;

    summary {
      cursor: pointer;
    }
    ul {
      margin: 0.25rem 0 0;
      padding-left: 1.1rem;
    }
  }

  @keyframes card-sheen {
    from {
      transform: translateX(-80%);
    }
    to {
      transform: translateX(80%);
    }
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
  .type-for-reader {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
  .amount {
    grid-area: amount;
    font-weight: 650;
    margin-left: auto;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .tile-actions {
    --action-width: max(1.8rem, 28px);
    display: grid;
    grid-column: 2;
    grid-row: 1 / span 2;
    grid-template-rows: subgrid;
    align-items: center;
    justify-items: center;
    padding-right: 0.3rem;
  }
  .category-check {
    margin-left: auto;
    display: inline-flex;
  }
  .quick-toggle {
    display: inline-grid;
    place-items: center;
    box-sizing: border-box;
    width: var(--action-width);
    position: relative;
    z-index: 1;
    border: 1px solid #aebdaf;
    border-radius: 0.3rem;
    color: #163f2b;
    background: #fff;
    padding: 0.2rem 0.35rem;
    min-height: 24px;
    font-size: 0.72rem;
    font-weight: 600;
    cursor: pointer;
  }
  .quick-toggle:focus-visible {
    outline: 2px solid #163f2b;
    outline-offset: 1px;
  }
  .list > li:not(.disabled) .quick-toggle {
    visibility: hidden;
  }
  @media (any-hover: hover) {
    .list > li:not(.disabled):hover .quick-toggle {
      visibility: visible;
    }
  }
  @media (any-pointer: coarse) {
    .quick-toggle {
      min-height: 32px;
    }
  }
  .kebab-btn {
    align-self: center;
    flex: none;
    box-sizing: border-box;
    width: var(--action-width);
    height: 1.8rem;
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: 0.35rem;
    background: transparent;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    cursor: pointer;

    &:hover {
      background: $clr-accent-soft;
    }
    &[aria-expanded='true'] {
      background: $clr-accent;
      color: white;
    }
    &:focus-visible {
      outline: 2px solid $clr-accent-ink;
    }
  }
  .menu {
    @include actions.surface;
    top: 2.5rem;
    right: 0.35rem;
    min-width: min(12rem, 100%);
    max-width: 100%;
    max-height: min(18rem, 45dvh);
    overflow: auto;
    button {
      @include actions.item;
      &:hover,
      &:focus-visible,
      &[aria-checked='true'] {
        color: $clr-accent-ink;
        background: $clr-accent-soft;
      }
      &:focus-visible {
        outline: 2px solid $clr-accent-ink;
        outline-offset: -2px;
      }
      &.danger {
        color: #8a1f1f;
      }
    }
    hr {
      @include actions.separator;
    }
  }
  .flyout-arrow {
    margin-left: auto;
    color: $clr-muted;
  }
  .category-flyout {
    @include actions.surface;
    position: fixed;
    inset: auto;
    margin: 0;
    min-width: 0;
    width: min(11rem, 80vw);
    max-height: min(21rem, 65dvh);
    overflow: auto;
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

  .danger {
    color: #8a1f1f;
  }
  .empty {
    padding: 0.8rem;
    color: $clr-muted;
  }
  .editor::backdrop {
    position: fixed;
    inset: 0;
    background: rgba(28, 33, 28, 0.35);
    z-index: 20;
  }
  .editor {
    margin: 0;
    border: 1px solid #668866;
    position: fixed;
    z-index: 21;
    left: 50%;
    top: 8vh;
    transform: translateX(-50%);
    width: min(38rem, calc(100% - 1.5rem));
    max-height: 84vh;
    @media (max-width: 640px) {
      top: 0.4rem;
      width: calc(100% - 0.6rem);
      max-height: calc(100vh - 0.8rem);
    }

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
  .editor header {
    justify-content: space-between;
    gap: 0.75rem;
    border-bottom: 1px solid $clr-border;
  }
  .editor h3 {
    margin: 0;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .desc-field input {
    font-size: 1.05rem;
    font-weight: 650;
  }
  .editor-tabs {
    flex: none;
    display: flex;
    gap: 0.15rem;
    padding: 0 0.55rem;
    border-bottom: 1px solid $clr-border;
    background: #fff;

    button {
      border: 0;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      background: transparent;
      padding: 0.45rem 0.75rem;
      color: $clr-muted;
      cursor: pointer;
    }

    button.selected {
      color: $clr-accent-ink;
      font-weight: 700;
      border-bottom-color: $clr-gold;
    }
  }
  .editor-foot {
    justify-content: center;
    border-top: 1px solid $clr-border;
  }
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

      & + button {
        margin-left: -1px;
      }
      &:first-child {
        border-radius: 0.35rem 0 0 0.35rem;
      }
      &:last-child {
        border-radius: 0 0.35rem 0.35rem 0;
      }
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
  @media (max-width: 640px) {
    .pair {
      grid-template-columns: 1fr;
    }
  }
  .editor h3 {
    margin: 0;
  }
  .editor label {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    font-size: 0.85rem;
  }
  .editor input,
  .editor select,
  .editor textarea {
    font: inherit;
    padding: 0.35rem 0.45rem;
    width: 100%;
    box-sizing: border-box;
  }
  .editor textarea {
    resize: vertical;
    min-height: 3.2rem;
  }

  .error {
    color: #8a1f1f;
    margin: 0;
  }
  .delete-dialog {
    box-sizing: border-box;
    width: min(24rem, calc(100vw - 2rem));
    max-height: 90dvh;
    overflow: auto;
    margin: auto;
    padding: 1.1rem;
    border: 1px solid $clr-border-strong;
    border-radius: 0.55rem;
    color: $clr-text;
    background: white;
    text-align: left;
    box-shadow: 0 0.6rem 2rem #14251a30;
    &::backdrop {
      background: #14251a66;
    }
    h3 {
      margin: 0;
      font-size: 1.15rem;
    }
    p {
      margin: 0.5rem 0 1rem;
      padding: 0;
      font-size: 0.9rem;
      line-height: 1.45;
      overflow-wrap: anywhere;
    }
    footer {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 0.5rem;
    }
    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
      min-height: 2.25rem;
      margin: 0;
      padding: 0.35rem 0.75rem;
      font: inherit;
      font-size: 0.85rem;
      border: 1px solid $clr-border-strong;
      border-radius: 0.35rem;
      background: white;
      color: $clr-text;
      cursor: pointer;
    }
    .delete-action {
      background: #912626;
      border-color: #912626;
      color: white;
    }
    button:focus-visible {
      outline: 2px solid #163f2b;
      outline-offset: 2px;
    }
  }
</style>
