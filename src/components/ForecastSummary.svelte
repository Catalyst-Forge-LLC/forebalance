<script lang="ts">
  import { computeForecastSummary } from '$lib/parser/forecastSummary';
  import { fmt } from '$lib/formatters/fmt';
  import type { BalanceFlags, ParsedEntry } from '$lib/parser/types';

  export let entries: ParsedEntry[] = [];
  export let balanceFlags: BalanceFlags;
  export let useMainBalance = true;
  export let onScrollToRow: (rowIndex: number) => void = () => {};

  $: summary = computeForecastSummary(entries, balanceFlags, useMainBalance);

  function scrollTo(point: { rowIndex: number } | null) {
    if (point) onScrollToRow(point.rowIndex);
  }

  function formatPoint(label: string, point: { balance: number; date: Date } | null, loud = false) {
    if (!point) return `${label}: —`;
    return `${label}: ${fmt.curr(point.balance)} on ${fmt.date(point.date)}`;
  }
</script>

{#if entries.length}
  <section class="forecast-summary" aria-label="Forecast summary">
    <h2>At a glance</h2>
    <ul>
      <li>
        <button type="button" class="summary-link" on:click={() => scrollTo(summary.lowest)}>
          {formatPoint('Lowest balance', summary.lowest)}
        </button>
      </li>
      <li>
        <button type="button" class="summary-link" on:click={() => scrollTo(summary.firstUncomfortable)}>
          {formatPoint('First below uncomfortable', summary.firstUncomfortable)}
        </button>
      </li>
      <li>
        <button type="button" class="summary-link" on:click={() => scrollTo(summary.firstLow)}>
          {formatPoint('First below low', summary.firstLow)}
        </button>
      </li>
      <li>
        <button
          type="button"
          class="summary-link"
          class:loud={summary.firstNegative !== null}
          on:click={() => scrollTo(summary.firstNegative)}
        >
          {formatPoint('First negative', summary.firstNegative, true)}
        </button>
      </li>
    </ul>
    <p class="day-counts">
      Days below uncomfortable: {summary.daysBelowUncomfortable} · below low:
      {summary.daysBelowLow} · below zero: {summary.daysBelowZero}
    </p>
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
      margin: 0 0 0.5rem;
      font-size: 1rem;
      color: #006600;
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
  }
</style>
