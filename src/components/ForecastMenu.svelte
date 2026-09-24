<script lang="ts">
  import { onMount } from 'svelte';
  import Icon from './Icon.svelte';

  export let ready = false;
  export let hasMultipleAccounts = false;
  export let onExportCsv: () => void = () => {};
  export let onCopyCsv: () => Promise<void> | void = () => {};
  export let onExportAll: () => void = () => {};
  export let onCopySummary: () => Promise<void> | void = () => {};
  export let onCompare: () => void = () => {};
  export let canCompare = false;

  let open = false;
  let root: HTMLElement;
  let copied: 'csv' | 'summary' | null = null;
  let copyTimer: ReturnType<typeof setTimeout> | undefined;

  function close() {
    open = false;
  }

  function toggle() {
    open = !open;
  }

  function flash(which: 'csv' | 'summary') {
    copied = which;
    if (copyTimer) clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
      copied = null;
    }, 1600);
  }

  async function copyCsv() {
    await onCopyCsv();
    flash('csv');
  }

  async function copySummary() {
    await onCopySummary();
    flash('summary');
  }

  function run(action: () => void) {
    action();
    close();
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
      if (copyTimer) clearTimeout(copyTimer);
    };
  });
</script>

<div class="menu" bind:this={root}>
  <button
    type="button"
    class="icon-btn"
    aria-expanded={open}
    aria-haspopup="menu"
    aria-label="Forecast actions"
    title="Forecast actions"
    on:click={toggle}
  >
    <Icon name="kebab" />
  </button>

  {#if open}
    <div class="panel" role="menu">
      <button type="button" role="menuitem" disabled={!ready} on:click={() => run(onExportCsv)}>
        <Icon name="download" /> Export CSV
      </button>
      <button type="button" role="menuitem" disabled={!ready} on:click={copyCsv}>
        <Icon name="export" /> {copied === 'csv' ? 'Copied' : 'Copy CSV'}
      </button>
      {#if hasMultipleAccounts}
        <button type="button" role="menuitem" disabled={!ready} on:click={() => run(onExportAll)}>
          <Icon name="download" /> Export all accounts
        </button>
      {/if}
      <hr />
      <button type="button" role="menuitem" disabled={!ready || !canCompare} on:click={() => run(onCompare)}>
        <Icon name="clone" /> Compare with…
      </button>
      <button type="button" role="menuitem" disabled={!ready} on:click={copySummary}>
        <Icon name="info" /> {copied === 'summary' ? 'Copied' : 'Copy summary'}
      </button>
    </div>
  {/if}
</div>

<style lang="scss">
  @use '../scss/colors' as *;

  .menu {
    position: relative;
  }

  .icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin: 0;
    padding: 0.28rem 0.45rem;
    color: $clr-accent-ink;
    background: $clr-accent-soft;
    border: 1px solid $clr-border-strong;
    border-radius: 0.35rem;
    cursor: pointer;
  }

  .icon-btn[aria-expanded='true'] {
    background: $clr-accent;
    color: #fff;
    border-color: $clr-accent;
  }

  .panel {
    position: absolute;
    top: calc(100% + 0.35rem);
    right: 0;
    z-index: 24;
    box-sizing: border-box;
    min-width: 14.5em;
    padding: 0.35rem;
    background: #fff;
    border: 1px solid $clr-border-strong;
    border-radius: 0.45rem;
    box-shadow: 0 0.45rem 1.2rem rgba(28, 33, 28, 0.14);
    text-align: left;
  }

  button[role='menuitem'] {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    width: 100%;
    margin: 0;
    padding: 0.4rem 0.5rem;
    border: 0;
    border-radius: 0.3rem;
    background: none;
    color: $clr-text;
    font-size: 0.85rem;
    text-align: left;
    cursor: pointer;
  }

  button[role='menuitem']:hover {
    background: $clr-accent-soft;
    color: $clr-accent-ink;
  }

  button[role='menuitem']:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  hr {
    margin: 0.3rem 0.25rem;
    border: 0;
    border-top: 1px solid $clr-border;
  }
</style>
