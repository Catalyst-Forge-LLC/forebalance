<script lang="ts">
  import { onMount } from 'svelte';
  import Icon from './Icon.svelte';

  let open = false;
  let root: HTMLElement;

  function toggle() {
    open = !open;
  }

  function close() {
    open = false;
  }

  function onDocumentPointer(e: PointerEvent) {
    if (!open || !root) return;
    if (!root.contains(e.target as Node)) close();
  }

  function onDocumentKey(e: KeyboardEvent) {
    if (e.key === 'Escape' && open) close();
  }

  onMount(() => {
    document.addEventListener('pointerdown', onDocumentPointer);
    document.addEventListener('keydown', onDocumentKey);
    return () => {
      document.removeEventListener('pointerdown', onDocumentPointer);
      document.removeEventListener('keydown', onDocumentKey);
    };
  });
</script>

<div class="syntax-help" bind:this={root}>
  <button
    type="button"
    class="toggle"
    aria-expanded={open}
    aria-controls="syntax-help-panel"
    on:click={toggle}
  >
    <Icon name="help" />
    Syntax
  </button>

  {#if open}
    <aside id="syntax-help-panel" class="panel" aria-label="Entry syntax">
      <header>
        <h3>Entry syntax</h3>
        <button type="button" class="close" on:click={close} aria-label="Close syntax help">×</button>
      </header>

      <p class="shape"><code>TYPE|WHEN|AMOUNT|DESCRIPTION</code></p>
      <pre class="example">B-CHCK1775-main|2026-04-01|1840|Balance Checking 1775
C|2026-04-01,R2W|1684|Paycheck
D|2026-04-01,R&lt;|1645|Rent</pre>

      <table>
        <tbody>
          <tr><td><code>B</code></td><td>Balance as of a date (resets)</td></tr>
          <tr><td><code>C</code></td><td>Credit (money in)</td></tr>
          <tr><td><code>D</code></td><td>Debit (money out)</td></tr>
          <tr><td><code>---</code></td><td>Section label (comment)</td></tr>
          <tr><td><code>!</code> or <code>#</code></td><td>Disable the whole line</td></tr>
        </tbody>
      </table>

      <h4>WHEN</h4>
      <table>
        <tbody>
          <tr><td><code>2026-04-01</code></td><td>Once</td></tr>
          <tr><td><code>,R</code></td><td>Monthly</td></tr>
          <tr><td><code>,R2W</code></td><td>Every two weeks</td></tr>
          <tr><td><code>,RW5</code></td><td>Weekly, five times</td></tr>
          <tr><td><code>,R3M</code></td><td>Every third month</td></tr>
          <tr><td><code>,RY</code></td><td>Yearly</td></tr>
          <tr><td><code>,RML</code> / <code>-L</code></td><td>Last day of the month</td></tr>
          <tr><td><code>,R&lt;</code> / <code>,R&gt;</code></td><td>Previous / next business day</td></tr>
        </tbody>
      </table>

      <h4>One occurrence</h4>
      <p><code>|#5=2026-05-08:65</code> — fifth only. Or <code>#5=65</code> / <code>#5=2026-05-08</code>.</p>

      <h4>Debt</h4>
      <pre class="example">D-CO|2026-04-15,R|150|Capital One-4321|CO|2800|19.99</pre>

      <p class="more"><a href="#help">Full Help</a></p>
    </aside>
  {/if}
</div>

<style lang="scss">
  @import '../scss/colors';

  .syntax-help {
    position: relative;
    display: flex;
    justify-content: flex-end;
  }

  .toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    margin: 0;
    padding: 0.2rem 0.65rem;
    font-size: 0.8rem;
    font-weight: 700;
    color: $clr-accent-ink;
    background: $clr-accent-soft;
    border: 1px solid $clr-border-strong;
    border-radius: 0.35rem;
    cursor: pointer;
  }

  .toggle[aria-expanded='true'] {
    background: $clr-accent;
    color: #fff;
    border-color: $clr-accent;
  }

  .panel {
    position: absolute;
    top: calc(100% + 0.35rem);
    right: 0;
    z-index: 20;
    box-sizing: border-box;
    width: min(24em, calc(100vw - 2rem));
    max-height: min(28em, 70vh);
    overflow: auto;
    padding: 0.65rem 0.8rem 0.8rem;
    text-align: left;
    background: #fff;
    border: 1px solid $clr-border-strong;
    border-radius: 0.5rem;
    box-shadow: 0 0.5rem 1.4rem rgba(28, 33, 28, 0.16);
    color: $clr-text;
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.35rem;
  }

  h3,
  h4 {
    margin: 0;
    color: $clr-accent-ink;
  }

  h3 {
    font-size: 0.95rem;
  }

  h4 {
    margin: 0.7rem 0 0.25rem;
    font-size: 0.75rem;
    letter-spacing: 0.03em;
    text-transform: uppercase;
  }

  .close {
    margin: 0;
    padding: 0 0.35rem;
    border: 0;
    background: none;
    color: $clr-muted;
    font-size: 1.25rem;
    line-height: 1;
    cursor: pointer;
  }

  .shape,
  p {
    margin: 0 0 0.4rem;
    font-size: 0.8rem;
    line-height: 1.4;
  }

  .example,
  code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  }

  .example {
    margin: 0 0 0.5rem;
    padding: 0.4rem 0.5rem;
    overflow-x: auto;
    background: $clr-accent-soft;
    border-radius: 0.3rem;
    font-size: 0.72rem;
    line-height: 1.45;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.78rem;
  }

  td {
    padding: 0.12rem 0.35rem 0.12rem 0;
    vertical-align: top;
  }

  td:first-child {
    white-space: nowrap;
    width: 40%;
  }

  .more {
    margin: 0.7rem 0 0;
  }

  .more a {
    color: $clr-accent-ink;
    font-weight: 700;
    font-size: 0.8rem;
  }

  @media (max-width: 40em) {
    .panel {
      position: fixed;
      top: auto;
      bottom: 1rem;
      right: 0.75rem;
      left: 0.75rem;
      width: auto;
      max-height: 55vh;
    }
  }
</style>
