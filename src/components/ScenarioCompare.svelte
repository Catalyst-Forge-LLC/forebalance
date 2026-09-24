<script lang="ts">
  import { fmt } from '$lib/formatters/fmt';
  import type { LineChange, ScenarioSnapshot } from '$lib/forecast/scenarioCompare';

  export let leftName = '';
  export let rightName = '';
  export let left: ScenarioSnapshot | null = null;
  export let right: ScenarioSnapshot | null = null;
  export let lines: LineChange[] = [];
  export let others: { id: string; name: string }[] = [];
  export let otherId = '';
  export let onPick: (id: string) => void = () => {};
  export let onOpen: (id: string) => void = () => {};
  export let onClose: () => void = () => {};

  function money(value: number | null): string {
    return value === null ? '—' : fmt.curr(value);
  }

  function when(date: Date | null, beyond: boolean): string {
    if (date) return fmt.date(date);
    return beyond ? 'After this forecast' : '—';
  }

  $: monthRows = [...new Set([
    ...(left?.months ?? []).map((month) => month.month),
    ...(right?.months ?? []).map((month) => month.month),
  ])].sort().map((month) => ({
    month,
    left: left?.months.find((item) => item.month === month)?.balance ?? null,
    right: right?.months.find((item) => item.month === month)?.balance ?? null,
  }));
</script>

<section class="compare" aria-label="Compare scenarios">
  <header>
    <h3>Compare</h3>
    <label>
      With
      <select value={otherId} on:change={(event) => onPick(event.currentTarget.value)}>
        {#each others as other}
          <option value={other.id}>{other.name}</option>
        {/each}
      </select>
    </label>
    <button type="button" on:click={() => onOpen(otherId)}>Open this scenario</button>
    <button type="button" on:click={onClose} aria-label="Close comparison">×</button>
  </header>

  {#if left && right}
    <table>
      <thead>
        <tr>
          <th></th>
          <th>{leftName}</th>
          <th>{rightName}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th>Ending balance</th>
          <td>{money(left.endingBalance)}</td>
          <td>{money(right.endingBalance)}</td>
        </tr>
        <tr>
          <th>Lowest balance</th>
          <td>{money(left.lowestBalance)}</td>
          <td>{money(right.lowestBalance)}</td>
        </tr>
        {#each monthRows as month}
          <tr>
            <th>{month.month}</th>
            <td>{money(month.left)}</td>
            <td>{money(month.right)}</td>
          </tr>
        {/each}
        {#each left.debts as debt}
          {@const other = right.debts.find((item) => item.id === debt.id)}
          <tr>
            <th>{debt.name} left</th>
            <td>{money(debt.remaining)}</td>
            <td>{money(other?.remaining ?? null)}</td>
          </tr>
          <tr>
            <th>{debt.name} payoff</th>
            <td>{when(debt.payoff, debt.beyond)}</td>
            <td>{other ? when(other.payoff, other.beyond) : '—'}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {:else}
    <p>One of these scenarios has no forecast yet.</p>
  {/if}

  {#if lines.length}
    <details>
      <summary>{lines.length} line {lines.length === 1 ? 'change' : 'changes'}</summary>
      <ul>
        {#each lines as line}
          <li>
            {#if line.kind === 'added'}Added {line.after}
            {:else if line.kind === 'removed'}Removed {line.before}
            {:else}Changed {line.before} → {line.after}{/if}
          </li>
        {/each}
      </ul>
    </details>
  {:else}
    <p>The entry lines match.</p>
  {/if}
</section>

<style lang="scss">
  @use '../scss/colors' as *;

  .compare {
    margin: 0 auto 0.6rem;
    max-width: 55em;
    width: calc(100% - 2rem);
    background: #fff;
    border: 1px solid $clr-border;
    border-radius: 0.4rem;
    padding: 0.6rem 0.75rem;
    text-align: left;
  }

  header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;

    h3 { margin: 0; flex: 1; }
    label { display: flex; align-items: center; gap: 0.35rem; font-size: 0.85rem; }
    select, button { font: inherit; }
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;

    th, td { padding: 0.2rem 0.35rem; text-align: left; }
    td { font-variant-numeric: tabular-nums; }
    tbody th { font-weight: 600; color: $clr-muted; }
  }

  details { margin-top: 0.4rem; font-size: 0.82rem; }
  ul { margin: 0.3rem 0 0; padding-left: 1.1rem; }
  p { margin: 0.3rem 0 0; color: $clr-muted; font-size: 0.85rem; }
</style>
