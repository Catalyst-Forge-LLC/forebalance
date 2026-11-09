<script lang="ts">
  import { settingsStore } from '#lib/stores/settings.ts';
  import { parseLineExtras, datedValue } from '#lib/parser/lineExtras.ts';
  export let before: string[] = [];
  export let after: string[] = [];
  export let starting: string[] | undefined = undefined;
  export let leftLabel = 'Original';
  export let rightLabel = 'Fork';
  export let leftCurrency = '';
  export let rightCurrency = '';
  type Field = { label: string; before: string; after: string };
  function describe(old: string[], next: string[], locale: string, leftCode: string, rightCode: string): Field[] {
    if (old.length > 1 || next.length > 1) return [];
    const a = old[0]?.split('|'),
      b = next[0]?.split('|'),
      fields = b ?? a;
    if (!fields || !/^[BCD](?:-|$)/.test(fields[0]) || fields.length < 4) return [];
    function amount(value: string | undefined, code: string, percent: boolean) {
      if (value === undefined) return '—';
      if (!/^-?\d+(?:\.\d+)?$/.test(value)) return value;
      return percent
        ? value + '%'
        : new Intl.NumberFormat(locale, { style: 'currency', currency: code, minimumFractionDigits: 0, maximumFractionDigits: 20 }).format(Number(value));
    }
    const pct = parseLineExtras(fields.slice(4)).strategy === 'pct';
    const row = (label: string, x: string | undefined, y: string | undefined, percent: boolean): Field => ({
      label,
      before: amount(x, leftCode, percent),
      after: amount(y, rightCode, percent),
    });
    if (!a || !b || (a.length === b.length && a.every((v, i) => i === 2 || v === b[i]))) {
      const label = fields[0].startsWith('B')
        ? 'Balance'
        : fields[0].startsWith('C')
          ? 'Credit'
          : fields[1].split(',')[1] === 'R'
            ? 'Monthly payment'
            : 'Payment';
      const result = [row(label, a?.[2], b?.[2], pct)];
      if (!a || !b) {
        if (fields[5]) result.push(row('Starting debt', a?.[5], b?.[5], false));
        if (fields[6]) result.push(row('APR', a?.[6], b?.[6], true));
      }
      return result;
    }
    // Dated fields are distinct from the initial balance and the base payment.
    if (JSON.stringify(a.filter((v) => !datedValue(v))) !== JSON.stringify(b.filter((v) => !datedValue(v)))) return [];
    const dates = [...new Set([...a, ...b].filter((v) => datedValue(v)).map((v) => v.split('=')[0]))];
    const changes: Field[] = [];
    for (const key of dates) {
      const prior = a.filter((v) => v.startsWith(key + '=')),
        updated = b.filter((v) => v.startsWith(key + '='));
      if (prior.length > 1 || updated.length > 1) return [];
      if (prior[0] === updated[0]) continue;
      const [kind, date] = key.split('@');
      changes.push(row((kind === 'debt' ? 'Balance on ' : 'Payment after ') + date, prior[0]?.split('=')[1], updated[0]?.split('=')[1], kind === 'pay' && pct));
    }
    return changes;
  }
  $: fields = describe(before, after, $settingsStore.locale, leftCurrency || $settingsStore.currencyIsoCode, rightCurrency || $settingsStore.currencyIsoCode);
  const display = (lines: string[]) => (lines.length ? lines.map((line) => line || '⟨blank line⟩').join('\n') : 'No entry');
</script>

{#each fields as field (field.label)}
  <div class="field">
    <small>{field.label}</small><strong class="values"
      ><span><small>{leftLabel}</small>{field.before}</span><span class="arrow" aria-hidden="true">→</span><span><small>{rightLabel}</small>{field.after}</span
      ></strong
    >
  </div>
{/each}
<details open={!fields.length || ((!before.length || !after.length) && (before[0] ?? after[0] ?? '').split('|').length > 7)}>
  <summary>View entry text</summary>
  {#if starting}<small>When forked</small><code>{display(starting)}</code>{/if}
  <small>{leftLabel}</small><code>{display(before)}</code><small>{rightLabel}</small><code>{display(after)}</code>
</details>

<style>
  .values {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    font-variant-numeric: tabular-nums;
  }
  .values small {
    font-weight: 400;
  }
  @media (max-width: 32rem) {
    .values {
      align-items: flex-start;
      flex-direction: column;
      gap: 0.2rem;
    }
    .values .arrow {
      display: none;
    }
    .values small {
      display: inline;
      margin-right: 0.5rem;
    }
  }
  .field {
    margin: 0.25rem 0;
  }
  small,
  strong,
  code {
    display: block;
  }
  small,
  summary {
    color: #435448;
  }
  summary {
    cursor: pointer;
  }
  code {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  details {
    font-size: 0.85em;
    margin-top: 0.3rem;
  }
  details small {
    margin-top: 0.4rem;
  }
</style>
