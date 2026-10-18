<script lang="ts">
  import { get } from 'svelte/store';
  import ForecastSparkline from './ForecastSparkline.svelte';
  import { computeForecastSummary } from '#lib/parser/forecastSummary.ts';
  import { fmt } from '#lib/formatters/fmt.ts';
  import { addNamedSet, addSetFromTemplate, entrySetsStore, listTemplates, resolveStarterClick, switchEntrySet, updateActiveRaw } from '#lib/data/entrySets.ts';
  import { buildSimpleExample, SIMPLE_EXAMPLE_ID, SIMPLE_EXAMPLE_NAME } from '#lib/data/simpleExample.ts';
  import { getTemplate } from '#lib/data/entryTemplates.ts';
  import { activateEntrySet } from '#lib/data/entriesPersistence.ts';
  import { rawEntriesStore } from '#lib/stores/settings.ts';
  import type { BalanceFlags, ParsedEntry } from '#lib/parser/types.ts';

  export let entries: ParsedEntry[] = [];
  export let balanceFlags: BalanceFlags;
  export let useMainBalance = true;
  export let forecastReady = false;
  /** True until stored entries have been read. The scenario card cannot render before that. */
  export let scenarioPending = false;

  let copied = false;
  let copyTimer: ReturnType<typeof setTimeout> | undefined;

  const templates = listTemplates();
  $: sets = $entrySetsStore.sets;
  $: active = sets.find((set) => set.id === $entrySetsStore.activeId);
  $: addedOwnScenario = sets.some((set) => {
    const template = set.templateId ? getTemplate(set.templateId) : undefined;
    return !template || set.name !== template.name;
  });
  $: summary = forecastReady ? computeForecastSummary(entries, balanceFlags, useMainBalance) : null;

  const exampleRaw = buildSimpleExample();

  function openForecast() {
    location.hash = '#forecast';
  }

  function openStarter(templateId: string) {
    const currentRaw = get(rawEntriesStore);
    const state = get(entrySetsStore);
    const decision = resolveStarterClick(state.sets, templateId);
    let next = decision.action === 'switch' ? switchEntrySet(decision.id, currentRaw) : null;
    if (decision.action === 'add') {
      updateActiveRaw(currentRaw);
      next = addSetFromTemplate(templateId);
    }
    if (next) activateEntrySet(next.raw);
    openForecast();
  }

  function unusedSimpleExample() {
    return sets.find((set) => set.templateId === SIMPLE_EXAMPLE_ID && set.name === SIMPLE_EXAMPLE_NAME);
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
  <header class="welcome-intro">
    <div class="intro-copy">
      <span class="eyebrow">Your cash flow, in perspective</span>
      <h1>See the balance ahead.</h1>
      <p>See when bills land before payday and how low your balance may go. Start with the sample, then enter your own paychecks, bills, and balances.</p>
      <div class="intro-actions">
        <a class="primary-link" href="#entries">Edit your entries <span aria-hidden="true">→</span></a>
        <button type="button" class="sample-link" on:click={loadSimpleExample}>Try a simple example</button>
      </div>
    <p class="intro-boundary">A browser cash-flow planner. Your working copy stays on this device.</p>
    </div>
    <img class="welcome-mark" src="/logo.png" width="150" height="150" alt="" />
  </header>

  {#if forecastReady && summary?.lowest}
    <a
      class="sliver"
      href="#forecast"
      aria-label="Current forecast for {active?.name ?? 'this scenario'}. Lowest {fmt.curr(summary.lowest.balance)} on {fmt.date(
        summary.lowest.date,
      )}. Open Forecast."
    >
      <div class="sliver-copy">
        <span class="sliver-kicker">Current scenario</span>
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
        <span class="sliver-cta">Open forecast <span aria-hidden="true">→</span></span>
      </div>
      <ForecastSparkline {entries} {balanceFlags} {useMainBalance} />
    </a>
  {:else if scenarioPending}
    <div class="sliver sliver-pending" role="status" aria-live="polite" aria-busy="true">
      <span class="sliver-kicker">This scenario</span>
      <span class="sliver-pending-label">Loading…</span>
    </div>
  {/if}

  <div class="learn-heading">
    <h2>A little guidance, when you need it</h2>
    <a href="#help">Full help →</a>
  </div>
  <details class="walkthrough disclosure">
    <summary><span><strong>How it works</strong><span class="summary-hint">Three entry types. One forecast.</span></span></summary>
    <div class="disclosure-body">
      <h3>How an entry becomes a forecast</h3>
      <p>
        Each entry is one item. <code>B</code> is the balance you read from the bank,
        <code>C</code> is money in, <code>D</code> is money out, and <code>,R</code> repeats monthly. These sample numbers are made up.
      </p>
      <pre class="example-src">{exampleRaw.trim()}</pre>
      <p>
        The <code>B</code> entry is checking on the 1st after rent clears: $420. A balance is the end-of-day number by default, so the $1,500 rent dated the same
        day is already in it and does not come out again. That $420 sits below the $500 uncomfortable mark until the $1,800 paycheck on the 15th brings it to $2,220.
        On a day with no balance entered, money in is counted before money out.
      </p>
      <div class="walkthrough-actions">
        <button type="button" class="button-action" on:click={loadSimpleExample}> Load this example </button>
        <button type="button" class="button-action copy" on:click={copySimpleExample}>
          {copied ? 'Copied' : 'Copy the example'}
        </button>
      </div>
    </div>
  </details>

  <details class="starters disclosure">
    <summary
      ><span><strong>Sample scenarios</strong><span class="summary-hint">Explore different paydays, bills, and debts.</span></span><span class="count"
        >{templates.length} examples</span
      ></summary
    >
    <div class="disclosure-body">
      <h3>{addedOwnScenario ? 'Add a starter' : 'Try a starter'}</h3>
      {#if addedOwnScenario}
        <p class="starter-note">These add a fresh copy. Your renamed scenarios stay where they are.</p>
      {/if}
      <div class="starter-grid">
        {#each templates as template (template)}
          {@const action = resolveStarterClick(sets, template.id).action}
          <button
            type="button"
            class="starter"
            class:selected={action === 'switch' && active?.templateId === template.id && active?.name === template.name}
            title={action === 'switch' ? `Open ${template.name} on Forecast` : `Add ${template.name} as a new scenario`}
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
    </div>
  </details>
  <footer class="welcome-footnote">
    <p>Your working copy stays in this browser. Export a copy to keep a backup. <a href="#privacy">Privacy</a></p>
    <p>A projection from your entries, not a bank statement or financial advice. <a href="#about">About</a></p>
  </footer>
</article>

<style lang="scss">
  @use '../scss/colors' as *;
  .welcome-page {
    box-sizing: border-box;
    width: 100%;
    max-width: 55em;
    min-width: 0;
    margin: 0 auto;
    padding: 1.2rem 1rem 2rem;
    text-align: left;
  }
  .welcome-intro {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    padding: 1.6rem 1.8rem;
    margin-bottom: 1.2rem;
    border-radius: 0.65rem;
    background: #163f2b;
    color: #fff;
    border-bottom: 4px solid $clr-gold;
  }
  .welcome-intro .intro-boundary { margin: 1rem 0 0; font-size: .875rem; line-height: 1.6; }
  .intro-copy {
    flex: 1;
    min-width: 0;
  }
  .eyebrow {
    color: #dfca94;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.11em;
    font-weight: 700;
  }
  .welcome-intro h1 {
    margin: 0.35rem 0 0.55rem;
    color: #fff;
    font-size: clamp(1.65rem, 3vw, 2.2rem);
    font-weight: 650;
    line-height: 1.15;
  }
  .welcome-intro p {
    color: #e1ece3;
    font-size: 0.95rem;
    line-height: 1.5;
    max-width: 36em;
    padding: 0;
    margin: 0 0 1rem;
  }
  .welcome-mark {
    width: 7rem;
    height: auto;
    flex-shrink: 0;
    filter: drop-shadow(0 5px 8px #081c1940);
  }
  .intro-actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.65rem 1rem;
  }
  .primary-link {
    display: inline-flex;
    gap: 1rem;
    align-items: center;
    border-radius: 0.3rem;
    padding: 0.55rem 0.8rem;
    background: #f0dca6;
    color: #183b29;
    font-size: 0.85rem;
    font-weight: 700;
    text-decoration: none;
  }
  .primary-link:hover {
    background: #fff0c8;
  }
  .sample-link {
    padding: 0.5rem 0;
    background: transparent;
    color: #fff;
    border: 0;
    text-decoration: underline;
    text-underline-offset: 0.2em;
    font-size: 0.85rem;
    cursor: pointer;
  }
  .sliver {
    display: grid;
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.2fr);
    gap: 1.25rem;
    align-items: center;
    margin-bottom: 1.5rem;
    padding: 1.1rem;
    background: #fff;
    border: 1px solid #aebdaf;
    border-left: 4px solid #27613a;
    border-radius: 0.5rem;
    box-shadow: 0 4px 12px #183b2910;
    color: inherit;
    text-decoration: none;
  }
  .sliver:hover {
    border-color: #27613a;
    background: #f7faf6;
  }
  .sliver-copy {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.2rem;
    min-width: 0;
  }
  .sliver-kicker {
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: $clr-muted;
  }
  .sliver-name {
    color: #163f2b;
    font-size: 1.25rem;
    overflow-wrap: anywhere;
  }
  .sliver-lowest {
    font-size: 1rem;
    font-weight: 600;
    color: $clr-text;
  }
  .sliver-note {
    color: $clr-muted;
    font-size: 0.8rem;
  }
  .loud {
    color: $clr-negative-ink;
  }
  .ok {
    color: $clr-accent-ink;
  }
  .sliver-cta {
    color: $clr-accent-ink;
    font-size: 0.8rem;
    font-weight: 700;
    margin-top: 0.45rem;
  }
  .sliver-pending {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
    min-height: 8rem;
  }
  .sliver-pending-label {
    color: $clr-muted;
  }
  .learn-heading {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0.6rem;
  }
  .learn-heading h2 {
    font-size: 0.95rem;
    margin: 0;
    color: #273c2e;
  }
  .learn-heading a {
    font-size: 0.75rem;
    color: $clr-accent-ink;
    white-space: nowrap;
  }
  .disclosure {
    background: #f5f7f3;
    border: 1px solid #ccd5c9;
    border-radius: 0.4rem;
    margin: 0 0 0.6rem;
  }
  summary {
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.7rem;
    padding: 0.8rem 1rem;
    list-style: none;
  }
  summary::-webkit-details-marker {
    display: none;
  }
  summary::before {
    content: '+';
    color: #27613a;
    font-size: 1.2rem;
    font-weight: 600;
    width: 0.8rem;
    flex-shrink: 0;
  }
  details[open] > summary::before {
    content: '−';
  }
  summary > span:first-child {
    flex: 1;
  }
  summary strong {
    display: block;
    font-size: 0.95rem;
    color: #163f2b;
  }
  .summary-hint {
    display: block;
    color: #536052;
    font-size: 0.8rem;
    margin-top: 0.1rem;
  }
  .count {
    color: #536052;
    font-size: 0.7rem;
    white-space: nowrap;
  }
  details[open] > summary {
    border-bottom: 1px solid #ccd5c9;
  }
  .disclosure-body {
    padding: 1rem;
    background: #fff;
    border-radius: 0 0 0.4rem 0.4rem;
  }
  .disclosure-body h3 {
    color: #163f2b;
    font-size: 1rem;
    margin: 0 0 0.6rem;
  }
  .disclosure-body p {
    font-size: 0.85rem;
    line-height: 1.55;
    margin: 0 0 0.75rem;
    padding: 0;
  }
  .example-src {
    max-width: 100%;
    overflow-x: auto;
    padding: 0.7rem;
    background: #edf2e9;
    border: 1px solid #ccd5c9;
    border-radius: 0.3rem;
    font-size: 0.75rem;
    margin: 0 0 0.8rem;
  }
  .walkthrough-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .walkthrough-actions .button-action {
    margin: 0;
    font-size: 0.8rem;
    background: #27613a;
  }
  .walkthrough-actions .copy {
    background: #fff;
    color: #163f2b;
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
    gap: 0.3rem;
    padding: 0.8rem;
    text-align: left;
    border: 1px solid #b7c2b7;
    border-radius: 0.35rem;
    background: #fff;
    color: $clr-text;
    cursor: pointer;
  }
  .starter strong {
    color: #163f2b;
    font-size: 0.9rem;
  }
  .starter span {
    color: $clr-muted;
    font-size: 0.8rem;
    line-height: 1.4;
  }
  .starter-add {
    color: $clr-accent-ink;
    font-size: 0.7rem;
    font-style: normal;
    font-weight: 700;
    text-transform: uppercase;
  }
  .starter.selected,
  .starter:hover {
    background: #edf2e9;
    border-color: #27613a;
  }
  .welcome-footnote {
    margin-top: 1rem;
    padding-top: 0.7rem;
    border-top: 1px solid #d5d9d3;
  }
  .welcome-footnote p {
    color: #586257;
    font-size: 0.7rem;
    line-height: 1.5;
    margin: 0.2rem 0;
    padding: 0;
  }
  .welcome-footnote a {
    color: $clr-accent-ink;
  }
  a:focus-visible,
  button:focus-visible,
  summary:focus-visible {
    outline: 3px solid #a37c24;
    outline-offset: 3px;
  }
  @media (max-width: 40em) {
    .welcome-page {
      padding: 0.7rem 0.65rem 1.5rem;
    }
    .welcome-intro {
      padding: 1.2rem;
    }
    .welcome-mark {
      display: none;
    }
    .sliver,
    .starter-grid {
      grid-template-columns: 1fr;
    }
    .learn-heading {
      align-items: flex-start;
    }
    .count {
      display: none;
    }
  }
</style>
