<script lang="ts">
  import { fmt } from '#lib/formatters/fmt.ts';
  import type { BalanceFlags, ParsedEntry } from '#lib/parser/types.ts';

  export let entries: ParsedEntry[] = [];
  export let balanceFlags: BalanceFlags;
  export let useMainBalance = true;

  const width = 640;
  const height = 72;
  const pad = { top: 6, right: 8, bottom: 16, left: 48 };

  $: plotEntries = entries.filter((e) => e.date && (e.type === 'B' || e.type === 'C' || e.type === 'D'));
  $: balances = plotEntries.map((e) => (useMainBalance ? (e.mainBalance ?? e.balance ?? 0) : (e.balance ?? 0)));
  $: dates = plotEntries.map((e) => e.date!);
  $: minBal = balances.length ? Math.min(...balances) : 0;
  $: maxBal = balances.length ? Math.max(...balances) : 0;
  $: yMin = Math.min(minBal, balanceFlags.below.uncomfortable, balanceFlags.below.low, 0);
  $: yMax = useMainBalance ? Math.max(maxBal, balanceFlags.above.goal) : maxBal;
  $: yRange = yMax - yMin || 1;
  $: yTicks = [yMax, yMin + yRange / 2, yMin];

  function xScale(t: number): number {
    if (dates.length < 2) return pad.left;
    const minT = dates[0].getTime();
    const maxT = dates[dates.length - 1].getTime();
    const range = maxT - minT || 1;
    return pad.left + ((t - minT) / range) * (width - pad.left - pad.right);
  }

  function makeYScale(min: number, range: number) {
    return (v: number) => pad.top + (1 - (v - min) / range) * (height - pad.top - pad.bottom);
  }
  $: yScale = makeYScale(yMin, yRange);

  $: linePoints = plotEntries.map((e, i) => `${xScale(dates[i].getTime()).toFixed(1)},${yScale(balances[i]).toFixed(1)}`).join(' ');

  $: minIndex = balances.length ? balances.reduce((best, b, i) => (b < balances[best] ? i : best), 0) : -1;

  $: goalIndex = useMainBalance ? balances.findIndex((b) => b >= balanceFlags.above.goal) : -1;
  $: thresholds = [
    { value: balanceFlags.above.goal, label: 'Goal', color: '#24618a', dash: '7 3' },
    {
      value: balanceFlags.below.uncomfortable,
      label: 'Uncomfortable',
      color: '#cc8800',
      dash: '4 3',
    },
    { value: balanceFlags.below.low, label: 'Low', color: '#cc4400', dash: '4 3' },
    { value: balanceFlags.below.negative, label: 'Zero', color: '#aa0000', dash: '2 2' },
  ];

  $: visibleThresholds = thresholds.filter((th) => (useMainBalance || th.label !== 'Goal') && th.value >= yMin && th.value <= yMax);
  $: startLabel = dates.length ? fmt.date(dates[0]) : '';
  $: endLabel = dates.length ? fmt.date(dates[dates.length - 1]) : '';
  $: balanceLabel = useMainBalance ? 'Main checking balance' : 'Remaining balance';
</script>

{#if plotEntries.length > 1}
  <figure class="sparkline">
    {#if useMainBalance}
      <figcaption>
        <span class="goal-line" aria-hidden="true"></span> Goal {fmt.curr(balanceFlags.above.goal)}{#if goalIndex >= 0}
          · first reached {fmt.date(dates[goalIndex])}{/if}
      </figcaption>
    {/if}
    <svg viewBox="0 0 {width} {height}" role="img" aria-label="{balanceLabel}. Red dot is the lowest point; dashed lines are your Settings thresholds.">
      {#each yTicks as tick, i (i)}
        <line x1={pad.left} y1={yScale(tick)} x2={width - pad.right} y2={yScale(tick)} stroke="#e8e8e8" stroke-width="1" />
        <text x={pad.left - 4} y={yScale(tick) + (i === 0 ? 4 : i === 2 ? -2 : 3)} text-anchor="end" class="axis-label">
          {fmt.curr(tick)}
        </text>
      {/each}

      {#each visibleThresholds as th (th)}
        <line
          x1={pad.left}
          y1={yScale(th.value)}
          x2={width - pad.right}
          y2={yScale(th.value)}
          stroke={th.color}
          stroke-width="1"
          stroke-dasharray={th.dash}
          opacity="0.75"
        />
      {/each}

      <polyline points={linePoints} fill="none" stroke="#006600" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />

      {#if minIndex >= 0}
        <circle cx={xScale(dates[minIndex].getTime())} cy={yScale(balances[minIndex])} r="4" fill="#aa0000" stroke="#fff" stroke-width="1" />
      {/if}

      {#if goalIndex >= 0}
        <path
          d="M0 -5 L5 0 L0 5 L-5 0 Z"
          transform="translate({xScale(dates[goalIndex].getTime())} {yScale(balances[goalIndex])})"
          fill="none"
          stroke="#24618a"
          stroke-width="2"
        >
          <title>First at or above goal: {fmt.curr(balances[goalIndex])} on {fmt.date(dates[goalIndex])}</title>
        </path>
      {/if}
      <text x={pad.left} y={height - 6} class="axis-label">{startLabel}</text>
      <text x={width - pad.right} y={height - 6} text-anchor="end" class="axis-label">{endLabel}</text>
    </svg>
  </figure>
{/if}

<style lang="scss">
  figcaption {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    color: #245471;
    font-size: 0.75rem;
    margin-bottom: 0.15rem;
  }
  .goal-line {
    width: 1.15rem;
    border-top: 2px dashed #24618a;
  }
  .sparkline {
    margin: 0;
    padding: 0;
    min-width: 0;

    svg {
      display: block;
      width: 100%;
      height: auto;
    }

    :global(.axis-label) {
      fill: #666;
      font-size: 9px;
      font-family: ui-sans-serif, system-ui, sans-serif;
    }
  }
</style>
