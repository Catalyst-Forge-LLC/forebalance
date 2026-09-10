<script lang="ts">
  import { computeForecastSummary } from '$lib/parser/forecastSummary';
  import { fmt } from '$lib/formatters/fmt';
  import type { BalanceFlags, ParsedEntry } from '$lib/parser/types';

  export let entries: ParsedEntry[] = [];
  export let balanceFlags: BalanceFlags;
  export let useMainBalance = true;
  export let onScrollToRow: (rowIndex: number) => void = () => {};

  $: summary = computeForecastSummary(entries, balanceFlags, useMainBalance);

  type SummaryItem = {
    key: string;
    label: string;
    point: { balance: number; date: Date; rowIndex: number } | null;
    loud?: boolean;
  };

  $: summaryItems = (
    [
      { key: 'lowest', label: 'Lowest balance', point: summary.lowest },
      {
        key: 'uncomfortable',
        label: 'First below uncomfortable',
        point: summary.firstUncomfortable,
      },
      { key: 'low', label: 'First below low', point: summary.firstLow },
      { key: 'negative', label: 'First negative', point: summary.firstNegative, loud: true },
    ] satisfies SummaryItem[]
  ).filter((item) => item.point !== null);

  $: dayCountParts = [
    summary.daysBelowUncomfortable > 0
      ? `${summary.daysBelowUncomfortable} day${summary.daysBelowUncomfortable === 1 ? '' : 's'} below uncomfortable`
      : null,
    summary.daysBelowLow > 0
      ? `${summary.daysBelowLow} day${summary.daysBelowLow === 1 ? '' : 's'} below low`
      : null,
    summary.daysBelowZero > 0
      ? `${summary.daysBelowZero} day${summary.daysBelowZero === 1 ? '' : 's'} below zero`
      : null,
  ].filter(Boolean);

  function scrollTo(point: { rowIndex: number } | null) {
    if (point) onScrollToRow(point.rowIndex);
  }

  function formatPoint(label: string, point: { balance: number; date: Date }) {
    return `${label}: ${fmt.curr(point.balance)} on ${fmt.date(point.date)}`;
  }
</script>

{#if entries.length && summaryItems.length}
  <section class="forecast-summary" aria-label="Forecast summary">
    <h2>At a glance</h2>
    <p class="summary-intro">Click a line to jump to that date in the table below.</p>
    <ul>
      {#each summaryItems as item}
        <li>
          <button
            type="button"
            class="summary-link"
            class:loud={item.loud && item.point !== null}
            on:click={() => scrollTo(item.point)}
          >
            {formatPoint(item.label, item.point!)}
          </button>
        </li>
      {/each}
    </ul>
    {#if dayCountParts.length}
      <p class="day-counts">{dayCountParts.join(' · ')}</p>
    {:else if summary.lowest}
      <p class="day-counts ok">You stay above your uncomfortable line for the whole forecast.</p>
    {/if}
  </section>
{/if}

<style lang="scss">
  .forecast-summary {
    text-align: left;
    max-width: 55em;
    margin: 0 auto 1rem;
    padding: 0.75rem 1rem;
    background: #f4fff4;
    border: 1px solid #009900;
    border-radius: 0.5rem;

    h2 {
      margin: 0 0 0.25rem;
      font-size: 1rem;
      color: #006600;
    }

    .summary-intro {
      margin: 0 0 0.5rem;
      font-size: 0.8rem;
      color: #555;
    }

    ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    li {
      margin: 0.25rem 0;
    }
  }

  .summary-link {
    background: none;
    border: none;
    color: #004400;
    cursor: pointer;
    font: inherit;
    padding: 0;
    text-align: left;
    text-decoration: underline;

    &.loud {
      color: #aa0000;
      font-weight: 700;
    }
  }

  .day-counts {
    margin: 0.75rem 0 0;
    font-size: 0.85rem;
    color: #333;

    &.ok {
      color: #006600;
    }
  }
</style>
