<script lang="ts">
  import { onMount } from 'svelte';
  import type { EntryTemplate } from '$lib/data/entryTemplates';
  import {
    formatHistoryLabel,
    historySnippet,
    type EntryVersion,
  } from '$lib/data/entryHistory';
  import Icon from './Icon.svelte';

  export let canDelete = true;
  export let canRoll = false;
  export let fsSupported = false;
  export let linkedFileName: string | null = null;
  export let templates: EntryTemplate[] = [];
  export let versions: EntryVersion[] = [];
  export let onClone: () => void = () => {};
  export let onDelete: () => void = () => {};
  export let onExport: () => void = () => {};
  export let onImport: () => void = () => {};
  export let onDrop: () => void = () => {};
  export let onLink: () => void = () => {};
  export let onUnlink: () => void = () => {};
  export let onRoll: () => void = () => {};
  export let onAddStarter: (id: string) => void = () => {};
  export let onRestore: (version: EntryVersion) => void = () => {};

  let open = false;
  let flyout: 'starter' | 'history' | null = null;
  let root: HTMLElement;

  function close() {
    open = false;
    flyout = null;
  }

  function toggle() {
    open = !open;
    if (!open) flyout = null;
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
    };
  });
</script>

<div class="menu" bind:this={root}>
  <button
    type="button"
    class="icon-btn"
    aria-expanded={open}
    aria-haspopup="menu"
    aria-label="Scenario actions"
    title="Scenario actions"
    on:click={toggle}
  >
    <Icon name="menu" />
  </button>

  {#if open}
    <div class="panel" role="menu">
      <button type="button" role="menuitem" on:click={() => run(onClone)}>
        <Icon name="clone" /> Clone
      </button>
      <button type="button" role="menuitem" disabled={!canDelete} on:click={() => run(onDelete)}>
        <Icon name="trash" /> Delete
      </button>
      <hr />
      <button type="button" role="menuitem" on:click={() => run(onImport)}>
        <Icon name="import" /> Import
      </button>
      <button type="button" role="menuitem" on:click={() => run(onExport)}>
        <Icon name="export" /> Export
      </button>
      <button type="button" role="menuitem" on:click={() => run(onDrop)}>
        <Icon name="import" /> Drop a file…
      </button>
      {#if fsSupported}
        {#if linkedFileName}
          <button type="button" role="menuitem" on:click={() => run(onUnlink)}>
            <Icon name="link" /> Unlink {linkedFileName}
          </button>
        {:else}
          <button type="button" role="menuitem" on:click={() => run(onLink)}>
            <Icon name="link" /> Link file…
          </button>
        {/if}
      {/if}
      <button
        type="button"
        role="menuitem"
        disabled={!canRoll}
        title={canRoll ? 'Rewrite old recurring starts' : 'Recurring starts are already current'}
        on:click={() => run(onRoll)}
      >
        <Icon name="calendar" /> Roll recurring starts
      </button>
      <hr />
      <div class="flyout-row">
        <button
          type="button"
          role="menuitem"
          aria-expanded={flyout === 'starter'}
          on:click={() => (flyout = flyout === 'starter' ? null : 'starter')}
        >
          <Icon name="plus" /> Add starter
          <span class="chevron">▸</span>
        </button>
        {#if flyout === 'starter'}
          <div class="submenu" role="menu">
            {#each templates as template}
              <button
                type="button"
                role="menuitem"
                title={template.blurb}
                on:click={() => run(() => onAddStarter(template.id))}
              >
                {template.name}
              </button>
            {/each}
          </div>
        {/if}
      </div>
      <div class="flyout-row">
        <button
          type="button"
          role="menuitem"
          aria-expanded={flyout === 'history'}
          on:click={() => (flyout = flyout === 'history' ? null : 'history')}
        >
          <Icon name="history" /> Previous versions
          <span class="chevron">▸</span>
        </button>
        {#if flyout === 'history'}
          <div class="submenu history" role="menu">
            {#if versions.length === 0}
              <p class="empty">No earlier versions yet. Edits in this scenario are kept here (last 20).</p>
            {:else}
              {#each versions as version}
                <button
                  type="button"
                  role="menuitem"
                  on:click={() => run(() => onRestore(version))}
                >
                  <span class="when">{formatHistoryLabel(version.at)}</span>
                  <span class="snip">{historySnippet(version.raw)}</span>
                </button>
              {/each}
            {/if}
          </div>
        {/if}
      </div>
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

  .panel,
  .submenu {
    position: absolute;
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

  .panel {
    top: calc(100% + 0.35rem);
    right: 0;
  }

  .flyout-row {
    position: relative;
  }

  .submenu {
    top: 0;
    right: calc(100% + 0.25rem);
    max-height: min(20em, 60vh);
    overflow: auto;
  }

  .submenu.history {
    min-width: 16em;
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

  button[role='menuitem']:hover,
  button[role='menuitem'][aria-expanded='true'] {
    background: $clr-accent-soft;
    color: $clr-accent-ink;
  }

  button[role='menuitem']:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .chevron {
    margin-left: auto;
    color: $clr-muted;
  }

  hr {
    margin: 0.3rem 0.25rem;
    border: 0;
    border-top: 1px solid $clr-border;
  }

  .when {
    font-weight: 700;
    color: $clr-accent-ink;
  }

  .snip {
    display: block;
    width: 100%;
    color: $clr-muted;
    font-size: 0.75rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .submenu.history button[role='menuitem'] {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.1rem;
  }

  .empty {
    margin: 0;
    padding: 0.45rem 0.5rem;
    font-size: 0.78rem;
    line-height: 1.4;
    color: $clr-muted;
  }

  @media (max-width: 40em) {
    .submenu {
      position: static;
      right: auto;
      margin-top: 0.15rem;
      box-shadow: none;
    }
  }
</style>
