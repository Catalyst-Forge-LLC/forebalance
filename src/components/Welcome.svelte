<script lang="ts">
  import { get } from 'svelte/store';
  import ImportedMarkdown from './ImportedMarkdown.svelte';
  import ForecastSparkline from './ForecastSparkline.svelte';
  import { computeForecastSummary } from '$lib/parser/forecastSummary';
  import { fmt } from '$lib/formatters/fmt';
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
  import { rawEntriesStore } from '$lib/stores/settings';
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
  <div class="welcome-intro">
    <h1>Welcome to ForeBalance</h1>
    <img class="welcome-mark" src="/logo.png" width="150" height="150" alt="" />
    <ImportedMarkdown filePath="/md/welcome.md" />
  </div>

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
      One line per transaction: <code>B</code> is the bank number, <code>C</code> is money in,
      <code>D</code> is money out, and <code>,R</code> repeats monthly.
      <a href="#help">Help</a> has the full syntax. Sample numbers are made up. This is not
      financial advice (<a href="#about">About</a>).
    </p>
    <pre class="example-src">{exampleRaw.trim()}</pre>
    <p>
      The <code>B</code> line is checking on the 1st after rent clears: $420. A balance line is
      the end-of-day number by default, so the $1,500 rent dated the same day is already in it and
      does not come out again. That $420 sits below the $500 uncomfortable mark until the $1,800
      paycheck on the 15th brings it to $2,220. On a day with no balance line, credits apply
      before debits.
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
  @use '../scss/colors' as *;

  .welcome-page {
    box-sizing: border-box;
    width: 100%;
    max-width: 55em;
    min-width: 0;
    margin: 0 auto;
    padding: 0.75rem 1rem 2rem;
    text-align: left;

    :global(.file-content) {
      padding-bottom: 0.35rem;
    }
  }

  .welcome-intro {
    display: flow-root;
  }

  .welcome-intro h1 {
    margin: 0 0 0.6rem;
    font-size: 1.45rem;
    font-weight: 600;
    color: $clr-accent-ink;
  }

  .welcome-mark {
    float: right;
    width: min(150px, 50%);
    height: auto;
    margin: 0.15rem 0 0.65rem 1rem;
  }

  .sliver {
    display: grid;
    grid-template-columns: minmax(12em, 0.9fr) minmax(14em, 1.2fr);
    gap: 0.75rem 1.25rem;
    align-items: center;
    margin: 0 0 1.25rem;
    padding: 0.7rem 0.85rem;
    background: linear-gradient(180deg, #ffffff 0%, #f7faf6 100%);
    border: 1px solid $clr-border;
    border-left: 3px solid $clr-accent;
    border-radius: 0.4rem;
    box-shadow: var(--fb-shadow-card);
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
  .starter-note {
    margin: 0 0 0.65rem;
    padding: 0;
    font-size: 0.9rem;
    color: $clr-text;
    line-height: 1.45;
  }

  .starter-note {
    font-size: 0.85rem;
    color: $clr-muted;
  }

  .example-src {
    box-sizing: border-box;
    max-width: 100%;
    margin: 0 0 0.75rem;
    padding: 0.65rem 0.75rem;
    overflow-x: auto;
    background: $clr-accent-soft;
    border: 1px solid $clr-border;
    border-radius: 0.35rem;
    color: $clr-text;
    font-size: 0.85rem;
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
    background: linear-gradient(180deg, #ffffff 0%, #f7faf6 100%);
    border: 1px solid $clr-border;
    border-radius: 0.4rem;
    box-shadow: var(--fb-shadow-card);
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
