<script lang="ts">
  import { get } from 'svelte/store';
  import ImportedMarkdown from './ImportedMarkdown.svelte';
  import ForecastSparkline from './ForecastSparkline.svelte';
  import ThresholdLegend from './ThresholdLegend.svelte';
  import { computeForecastSummary } from '$lib/parser/forecastSummary';
  import { parseEntries } from '$lib/parser/parseEntries';
  import { fmt } from '$lib/formatters/fmt';
  import { flagIndicator, flagLabel } from '$lib/formatters/thresholdMarks';
  import {
    addNamedSet,
    addSetFromTemplate,
    entrySetsStore,
    listTemplates,
    resolveStarterClick,
    switchEntrySet,
    updateActiveRaw,
  } from '$lib/data/entrySets';
  import {
    buildSimpleExample,
    SIMPLE_EXAMPLE_ID,
    SIMPLE_EXAMPLE_NAME,
  } from '$lib/data/simpleExample';
  import { getTemplate } from '$lib/data/entryTemplates';
  import { activateEntrySet } from '$lib/data/entriesPersistence';
  import { rawEntriesStore, settingsStore } from '$lib/stores/settings';
  import type { BalanceFlags, ParsedEntry } from '$lib/parser/types';

  export let entries: ParsedEntry[] = [];
  export let balanceFlags: BalanceFlags;
  export let useMainBalance = true;
  export let forecastReady = false;

  let copied = false;
  let copyTimer: ReturnType<typeof setTimeout> | undefined;

  $: templates = listTemplates();
  $: sets = $entrySetsStore.sets;
  $: active = sets.find((set) => set.id === $entrySetsStore.activeId);
  $: addedOwnScenario = sets.some((set) => {
    const template = set.templateId ? getTemplate(set.templateId) : undefined;
    return !template || set.name !== template.name;
  });
  $: summary = forecastReady ? computeForecastSummary(entries, balanceFlags, useMainBalance) : null;

  $: exampleRaw = buildSimpleExample();
  $: exampleParsed = parseEntries(exampleRaw, 3, balanceFlags, {
    useFederalHolidays: $settingsStore.useFederalHolidays,
  });
  $: exampleMain = exampleParsed[1]
    ? Object.values(exampleParsed[1]).find((account) => account.isMain)
    : undefined;
  $: exampleRows =
    exampleParsed[0] && exampleMain ? exampleParsed[0][exampleMain.id].slice(0, 6) : [];

  function openForecast() {
    location.hash = '#forecast';
  }

  function openStarter(templateId: string) {
    const currentRaw = get(rawEntriesStore);
    const state = get(entrySetsStore);
    const decision = resolveStarterClick(state.sets, templateId);
    let next =
      decision.action === 'switch' ? switchEntrySet(decision.id, currentRaw) : null;
    if (decision.action === 'add') {
      updateActiveRaw(currentRaw);
      next = addSetFromTemplate(templateId);
    }
    if (next) activateEntrySet(next.raw);
    openForecast();
  }

  function unusedSimpleExample() {
    return sets.find(
      (set) => set.templateId === SIMPLE_EXAMPLE_ID && set.name === SIMPLE_EXAMPLE_NAME,
    );
  }

  function loadSimpleExample() {
    const currentRaw = get(rawEntriesStore);
    const unused = unusedSimpleExample();
    if (unused) {
      const next = switchEntrySet(unused.id, currentRaw);
      if (next) activateEntrySet(next.raw);
    } else {
      updateActiveRaw(currentRaw);
      const added = addNamedSet(SIMPLE_EXAMPLE_NAME, buildSimpleExample(), SIMPLE_EXAMPLE_ID);
      activateEntrySet(added.raw);
    }
    openForecast();
  }

  async function copySimpleExample() {
    try {
      await navigator.clipboard.writeText(exampleRaw);
      copied = true;
      if (copyTimer) clearTimeout(copyTimer);
      copyTimer = setTimeout(() => {
        copied = false;
      }, 2000);
    } catch {
      copied = false;
    }
  }
</script>

<article class="welcome-page">
  <ImportedMarkdown filePath="/md/welcome.md" />

  {#if forecastReady && summary?.lowest}
    <a
      class="sliver"
      href="#forecast"
      aria-label="Current forecast for {active?.name ?? 'this scenario'}. Lowest {fmt.curr(
        summary.lowest.balance,
      )} on {fmt.date(summary.lowest.date)}. Open Forecast."
    >
      <div class="sliver-copy">
        <span class="sliver-kicker">This scenario</span>
        <strong class="sliver-name">{active?.name ?? 'Untitled'}</strong>
        <span class="sliver-lowest" class:loud={!!summary.firstNegative}>
          Lowest {fmt.curr(summary.lowest.balance)} · {fmt.date(summary.lowest.date)}
        </span>
        {#if summary.firstNegative}
          <span class="sliver-note loud">Goes negative</span>
        {:else if summary.daysBelowUncomfortable === 0}
          <span class="sliver-note ok">Above uncomfortable the whole window</span>
        {:else}
          <span class="sliver-note">{summary.daysBelowUncomfortable}d under uncomfortable</span>
        {/if}
        <span class="sliver-cta">Open Forecast</span>
      </div>
      <ForecastSparkline {entries} {balanceFlags} {useMainBalance} />
    </a>
  {/if}

  <section class="walkthrough" aria-label="How a line becomes a forecast">
    <h2>How a line becomes a forecast</h2>
    <p>
      One credit and one debit, in the same pipe-separated syntax the editor uses.
      <code>C</code> is money in, <code>D</code> is money out, and <code>,R</code> repeats the line
      monthly. The starting <code>B</code> line sets checking to $420.
    </p>
    <pre class="example-src">{exampleRaw.trim()}</pre>
    <p>
      Same-day order is balance, then credits, then debits. Rent on the 1st therefore lands after
      the starting balance, and the paycheck on the 15th raises the running total. These are made-up
      amounts used to show the format. They are not personal financial advice.
    </p>
    {#if exampleRows.length}
      <div class="example-table-wrap">
        <table>
          <caption>First forecast rows from those three lines</caption>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th class="num">Credit</th>
              <th class="num">Debit</th>
              <th class="num">Balance</th>
            </tr>
          </thead>
          <tbody>
            {#each exampleRows as row}
              <tr class="balance-{row.flag || 'plain'}">
                <td>{fmt.date(row.date)}</td>
                <td class="desc">{row.desc}</td>
                <td class="num">{row.type === 'C' ? fmt.curr(row.amount) : ''}</td>
                <td class="num">{row.type === 'D' ? fmt.curr(row.amount) : ''}</td>
                <td class="num">
                  {flagIndicator(row.flag)}{fmt.curr(row.mainBalance ?? row.balance ?? 0)}
                  {#if flagLabel(row.flag)}
                    <span class="flag-word">{flagLabel(row.flag)}</span>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
    <ThresholdLegend />
    <p class="persist-note">
      Row marks use your current Settings thresholds. Loading this example adds a scenario you can
      edit on Entries. It stays in this browser until you export it or clear site data.
    </p>
    <div class="walkthrough-actions">
      <button type="button" class="button-action" on:click={loadSimpleExample}>
        Load this example
      </button>
      <button type="button" class="button-action copy" on:click={copySimpleExample}>
        {copied ? 'Copied' : 'Copy the lines'}
      </button>
    </div>
  </section>

  <section class="starters" aria-label="Starter scenarios">
    <h2>{addedOwnScenario ? 'Add a starter' : 'Try a starter'}</h2>
    {#if addedOwnScenario}
      <p class="starter-note">
        These add a fresh copy. Your renamed scenarios stay where they are.
      </p>
    {/if}
    <div class="starter-grid">
      {#each templates as template}
        {@const action = resolveStarterClick(sets, template.id).action}
        <button
          type="button"
          class="starter"
          class:selected={action === 'switch' &&
            (active?.templateId === template.id && active?.name === template.name)}
          title={action === 'switch'
            ? `Open ${template.name} on Forecast`
            : `Add ${template.name} as a new scenario`}
          on:click={() => openStarter(template.id)}
        >
          <strong>{template.name}</strong>
          <span>{template.blurb}</span>
          {#if action === 'add'}
            <em class="starter-add">Add new</em>
          {/if}
        </button>
      {/each}
    </div>
  </section>
</article>

<style lang="scss">
  @import '../scss/colors';

  .welcome-page {
    max-width: 55em;
    margin: 0 auto;
    padding: 0.75rem 1rem 2rem;
    text-align: left;

    :global(.file-content) {
      padding-bottom: 0.35rem;
    }
  }

  .sliver {
    display: grid;
    grid-template-columns: minmax(12em, 0.9fr) minmax(14em, 1.2fr);
    gap: 0.75rem 1.25rem;
    align-items: center;
    margin: 0 0 1.25rem;
    padding: 0.7rem 0.85rem;
    background: $clr-surface;
    border: 1px solid $clr-border;
    border-left: 3px solid $clr-accent;
    border-radius: 0.4rem;
    color: inherit;
    text-decoration: none;

    &:hover,
    &:focus-visible {
      background: $clr-accent-soft;
      outline: 2px solid $clr-accent;
      outline-offset: 2px;
    }
  }

  .sliver-copy {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.15rem;
    min-width: 0;
  }

  .sliver-kicker,
  .sliver-cta {
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    color: $clr-accent-ink;
  }

  .sliver-cta {
    margin-top: 0.35rem;
    text-decoration: underline;
  }

  .sliver-name {
    font-size: 1.15rem;
    color: $clr-accent-ink;
  }

  .sliver-lowest {
    font-size: 0.95rem;
    color: $clr-text;

    &.loud {
      color: $clr-negative-ink;
      font-weight: 700;
    }
  }

  .sliver-note {
    font-size: 0.8rem;
    color: $clr-muted;

    &.ok {
      color: $clr-accent-ink;
    }

    &.loud {
      color: $clr-negative-ink;
      font-weight: 700;
    }
  }

  .walkthrough,
  .starters {
    margin: 0 0 1.5rem;
  }

  .walkthrough h2,
  .starters h2 {
    margin: 0 0 0.5rem;
    font-size: 1.05rem;
    color: $clr-accent-ink;
  }

  .walkthrough p,
  .persist-note,
  .starter-note {
    margin: 0 0 0.65rem;
    padding: 0;
    font-size: 0.9rem;
    color: $clr-text;
    line-height: 1.45;
  }

  .starter-note,
  .persist-note {
    font-size: 0.85rem;
    color: $clr-muted;
  }

  .example-src {
    margin: 0 0 0.75rem;
    padding: 0.65rem 0.75rem;
    overflow-x: auto;
    background: $clr-accent-soft;
    border: 1px solid $clr-border;
    border-radius: 0.35rem;
    color: $clr-text;
    font-size: 0.85rem;
  }

  .example-table-wrap {
    margin: 0 0 0.75rem;
    overflow-x: auto;
  }

  table {
    width: 100%;
    min-width: 28em;
    border-collapse: collapse;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.8rem;
  }

  caption {
    caption-side: top;
    text-align: left;
    padding-bottom: 0.35rem;
    font-family: inherit;
    font-size: 0.8rem;
    font-weight: 700;
    color: $clr-accent-ink;
  }

  th,
  td {
    padding: 0.3rem 0.4rem;
    border-bottom: 1px solid $clr-border;
  }

  th {
    background: $clr-accent-soft;
    color: $clr-accent-ink;
    font-weight: 700;
  }

  .desc {
    text-align: left;
  }

  .num {
    text-align: right;
    white-space: nowrap;
  }

  .flag-word {
    display: inline-block;
    margin-left: 0.25rem;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }

  .balance-plain {
    background: $clr-surface;
  }
  .balance-negative {
    background: $clr-negative-bg;
    color: $clr-negative-ink;
    font-weight: 700;
  }
  .balance-low {
    background: $clr-low-bg;
    color: $clr-low-ink;
    font-weight: 700;
  }
  .balance-uncomfortable {
    background: $clr-uncomf-bg;
    color: $clr-uncomf-ink;
    font-weight: 700;
  }
  .balance-goal {
    background: $clr-goal-bg;
    color: $clr-goal-ink;
    font-weight: 700;
  }

  .walkthrough-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .walkthrough-actions :global(.button-action) {
    display: inline-flex;
    margin: 0;
    font-size: 0.85rem;
  }

  .copy {
    background-color: $clr-surface !important;
    color: $clr-accent-ink !important;
  }

  .starter-add {
    margin-top: 0.15rem;
    font-size: 0.75rem;
    font-style: normal;
    font-weight: 700;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    color: $clr-accent-ink;
  }

  .starter-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.6rem;
  }

  .starter {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
    padding: 0.65rem 0.75rem;
    background: $clr-surface;
    border: 1px solid $clr-border;
    border-radius: 0.4rem;
    color: $clr-text;
    cursor: pointer;
    text-align: left;

    strong {
      font-size: 0.95rem;
      color: $clr-accent-ink;
    }

    span {
      font-size: 0.8rem;
      color: $clr-muted;
      line-height: 1.35;
    }

    &.selected {
      border-color: $clr-accent;
      background: $clr-accent-soft;
    }

    &:hover,
    &:focus-visible {
      border-color: $clr-accent;
      outline: 2px solid $clr-accent;
      outline-offset: 2px;
    }
  }

  @media (max-width: 40em) {
    .sliver,
    .starter-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
