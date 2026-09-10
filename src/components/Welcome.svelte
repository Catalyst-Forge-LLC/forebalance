<script lang="ts">
  import { get } from 'svelte/store';
  import ImportedMarkdown from './ImportedMarkdown.svelte';
  import ForecastSparkline from './ForecastSparkline.svelte';
  import { computeForecastSummary } from '$lib/parser/forecastSummary';
  import { fmt } from '$lib/formatters/fmt';
  import {
    addSetFromTemplate,
    entrySetsStore,
    listTemplates,
    resolveStarterClick,
    switchEntrySet,
    updateActiveRaw,
  } from '$lib/data/entrySets';
  import { getTemplate } from '$lib/data/entryTemplates';
  import { activateEntrySet } from '$lib/data/entriesPersistence';
  import { rawEntriesStore } from '$lib/stores/settings';
  import type { BalanceFlags, ParsedEntry } from '$lib/parser/types';

  export let entries: ParsedEntry[] = [];
  export let balanceFlags: BalanceFlags;
  export let useMainBalance = true;
  export let forecastReady = false;

  $: templates = listTemplates();
  $: sets = $entrySetsStore.sets;
  $: active = sets.find((set) => set.id === $entrySetsStore.activeId);
  $: addedOwnScenario = sets.some((set) => {
    const template = set.templateId ? getTemplate(set.templateId) : undefined;
    return !template || set.name !== template.name;
  });
  $: summary = forecastReady ? computeForecastSummary(entries, balanceFlags, useMainBalance) : null;

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
    background: #f8fff8;
    border: 1px solid #009900;
    border-radius: 0.5rem;
    color: inherit;
    text-decoration: none;

    &:hover,
    &:focus-visible {
      background: #eef9ee;
      outline: 2px solid #009900;
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
    color: #006600;
  }

  .sliver-cta {
    margin-top: 0.35rem;
    text-decoration: underline;
  }

  .sliver-name {
    font-size: 1.15rem;
    color: #004400;
  }

  .sliver-lowest {
    font-size: 0.95rem;
    color: #004400;

    &.loud {
      color: #aa0000;
      font-weight: 700;
    }
  }

  .sliver-note {
    font-size: 0.8rem;
    color: #555;

    &.ok {
      color: #006600;
    }

    &.loud {
      color: #aa0000;
      font-weight: 700;
    }
  }

  .starters h2 {
    margin: 0 0 0.5rem;
    font-size: 1.05rem;
    color: #006600;
  }

  .starter-note {
    margin: 0 0 0.65rem;
    font-size: 0.85rem;
    color: #555;
  }

  .starter-add {
    margin-top: 0.15rem;
    font-size: 0.75rem;
    font-style: normal;
    font-weight: 700;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    color: #006600;
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
    background: #f8fff8;
    border: 1px solid #cce8cc;
    border-radius: 0.5rem;
    color: #004400;
    cursor: pointer;
    text-align: left;

    strong {
      font-size: 0.95rem;
    }

    span {
      font-size: 0.8rem;
      color: #444;
      line-height: 1.35;
    }

    &.selected {
      border-color: #009900;
      background: #e8f5e8;
      box-shadow: inset 0 0 0 1px #009900;
    }

    &:hover,
    &:focus-visible {
      border-color: #009900;
      outline: 2px solid #009900;
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
