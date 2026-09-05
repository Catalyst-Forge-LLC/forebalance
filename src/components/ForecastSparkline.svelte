<script lang="ts">
  import type { BalanceFlags, ParsedEntry } from '$lib/parser/types';

  export let entries: ParsedEntry[] = [];
  export let balanceFlags: BalanceFlags;
  export let useMainBalance = true;

  const width = 640;
  const height = 100;
  const pad = { top: 8, right: 8, bottom: 20, left: 48 };

  $: plotEntries = entries.filter(
    (e) => e.date && (e.type === 'B' || e.type === 'C' || e.type === 'D'),
  );
  $: balances = plotEntries.map((e) =>
    useMainBalance ? (e.mainBalance ?? e.balance ?? 0) : (e.balance ?? 0),
  );
  $: dates = plotEntries.map((e) => e.date!.getTime());
  $: minBal = balances.length ? Math.min(...balances) : 0;
  $: maxBal = balances.length ? Math.max(...balances) : 0;
  $: yMin = Math.min(minBal, balanceFlags.below.uncomfortable, balanceFlags.below.low, 0);
  $: yMax = Math.max(maxBal, balanceFlags.above.goal);
  $: yRange = yMax - yMin || 1;

  function xScale(t: number): number {
    if (dates.length < 2) return pad.left;
    const minT = dates[0];
    const maxT = dates[dates.length - 1];
    const range = maxT - minT || 1;
    return pad.left + ((t - minT) / range) * (width - pad.left - pad.right);
  }

  function yScale(v: number): number {
    return pad.top + (1 - (v - yMin) / yRange) * (height - pad.top - pad.bottom);
  }

  $: linePoints = plotEntries
    .map((e, i) => `${xScale(dates[i]).toFixed(1)},${yScale(balances[i]).toFixed(1)}`)
    .join(' ');

  $: minIndex = balances.length
    ? balances.reduce((best, b, i) => (b < balances[best] ? i : best), 0)
    : -1;

  $: thresholds = [
    { value: balanceFlags.above.goal, label: 'goal', color: '#009900', dash: '4 3' },
    { value: balanceFlags.below.uncomfortable, label: 'uncomfortable', color: '#cc8800', dash: '4 3' },
    { value: balanceFlags.below.low, label: 'low', color: '#cc4400', dash: '4 3' },
    { value: balanceFlags.below.negative, label: 'zero', color: '#aa0000', dash: '2 2' },
  ];
</script>

{#if plotEntries.length > 1}
  <figure class="sparkline" aria-label="Balance over time">
    <svg viewBox="0 0 {width} {height}" role="img" aria-hidden="true">
      {#each thresholds as th}
        {#if th.value >= yMin && th.value <= yMax}
          <line
            x1={pad.left}
            y1={yScale(th.value)}
            x2={width - pad.right}
            y2={yScale(th.value)}
            stroke={th.color}
            stroke-width="1"
            stroke-dasharray={th.dash}
            opacity="0.7"
          />
        {/if}
      {/each}
      <polyline
        points={linePoints}
        fill="none"
        stroke="#006600"
        stroke-width="2"
        stroke-linejoin="round"
        stroke-linecap="round"
      />
      {#if minIndex >= 0}
        <circle
          cx={xScale(dates[minIndex])}
          cy={yScale(balances[minIndex])}
          r="4"
          fill="#aa0000"
          stroke="#fff"
          stroke-width="1"
        />
      {/if}
    </svg>
    <figcaption class="sr-only">
      Balance trend with threshold lines; lowest point marked in red.
    </figcaption>
  </figure>
{/if}

<style lang="scss">
  .sparkline {
    max-width: 55em;
    margin: 0 auto 0.75rem;
    padding: 0.25rem 0.5rem;
    background: #fafafa;
    border: 1px solid #ddd;
    border-radius: 0.5rem;

    svg {
      display: block;
      width: 100%;
      height: auto;
    }
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    border: 0;
  }
</style>
