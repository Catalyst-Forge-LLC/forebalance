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
      { key: 'lowest', label: 'Lowest', point: summary.lowest },
      {
        key: 'uncomfortable',
        label: 'Uncomfortable',
        point: summary.firstUncomfortable,
      },
      { key: 'low', label: 'Low', point: summary.firstLow },
      { key: 'negative', label: 'Negative', point: summary.firstNegative, loud: true },
    ] satisfies SummaryItem[]
  ).filter((item) => item.point !== null);

  $: dayCountParts = [
    summary.daysBelowUncomfortable > 0 ? `${summary.daysBelowUncomfortable}d uncomf.` : null,
    summary.daysBelowLow > 0 ? `${summary.daysBelowLow}d low` : null,
    summary.daysBelowZero > 0 ? `${summary.daysBelowZero}d below 0` : null,
  ].filter(Boolean);

  function scrollTo(point: { rowIndex: number } | null) {
    if (point) onScrollToRow(point.rowIndex);
  }

  function formatPoint(label: string, point: { balance: number; date: Date }) {
    return `${label} ${fmt.curr(point.balance)} · ${fmt.date(point.date)}`;
  }
</script>

{#if entries.length && summaryItems.length}
  <section class="forecast-summary" aria-label="Forecast summary">
    {#each summaryItems as item}
      <button
        type="button"
        class="summary-link"
        class:loud={item.loud && item.point !== null}
        title="Jump to this date in the table"
        on:click={() => scrollTo(item.point)}
      >
        {formatPoint(item.label, item.point!)}
      </button>
    {/each}
    {#if dayCountParts.length}
      <span class="day-counts">{dayCountParts.join(' · ')}</span>
    {:else if summary.lowest}
      <span class="day-counts ok">Above uncomfortable the whole window</span>
    {/if}
  </section>
{/if}

<style lang="scss">
  .forecast-summary {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.35rem 0.85rem;
    text-align: left;
  }

  .summary-link {
    background: none;
    border: none;
    color: #004400;
    cursor: pointer;
    font: inherit;
    font-size: 0.85rem;
    padding: 0;
    text-align: left;
    text-decoration: underline;

    &.loud {
      color: #aa0000;
      font-weight: 700;
    }
  }

  .day-counts {
    font-size: 0.8rem;
    color: #555;

    &.ok {
      color: #006600;
    }
  }
</style>
