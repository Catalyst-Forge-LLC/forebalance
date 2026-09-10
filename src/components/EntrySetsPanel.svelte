<script lang="ts">
  import {
    addSetFromTemplate,
    cloneEntrySet,
    deleteEntrySet,
    downloadTextFile,
    entrySetsStore,
    getActiveSet,
    listTemplates,
    updateActiveRaw,
  } from '$lib/data/entrySets';
  import { activateEntrySet } from '$lib/data/entriesPersistence';
  import { rawEntriesStore } from '$lib/stores/settings';
  import { fmt } from '$lib/formatters/fmt';
  import ConfirmModal from './ConfirmModal.svelte';
  import Icon from './Icon.svelte';
  import SetSwitcher from './SetSwitcher.svelte';

  let templateToAdd = listTemplates()[0]?.id ?? 'close-month';
  let deleteOpen = false;

  $: canDelete = $entrySetsStore.sets.length > 1;
  $: templates = listTemplates();
  $: selectedTemplate = templates.find((template) => template.id === templateToAdd);
  $: activeName = getActiveSet($entrySetsStore)?.name ?? 'this set';

  function onClone() {
    updateActiveRaw($rawEntriesStore);
    const clone = cloneEntrySet($entrySetsStore.activeId);
    activateEntrySet(clone.raw);
  }

  function onDelete() {
    if (!canDelete) return;
    deleteOpen = true;
  }

  function confirmDelete() {
    const next = deleteEntrySet($entrySetsStore.activeId);
    const selected = next.sets.find((set) => set.id === next.activeId);
    if (selected) activateEntrySet(selected.raw);
    deleteOpen = false;
  }

  function onAddTemplate() {
    updateActiveRaw($rawEntriesStore);
    const added = addSetFromTemplate(templateToAdd);
    activateEntrySet(added.raw);
  }

  function downloadCurrentSet() {
    const slug = activeName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    downloadTextFile(`forebalance-${fmt.date3()}-${slug}.psv`, $rawEntriesStore);
  }
</script>

<div class="sets-shell">
  <SetSwitcher />

  <slot />

  <div class="dock">
    <div class="dock-left">
      <button type="button" class="button-action" on:click={onClone}>
        <Icon name="clone" /> Clone
      </button>
      <button type="button" class="button-action" on:click={onDelete} disabled={!canDelete}>
        <Icon name="trash" /> Delete
      </button>
      <span class="group" title="This set only — not every set you have">
        <slot name="files" />
        <button type="button" class="button-action" on:click={downloadCurrentSet}>
          <Icon name="export" /> Export
        </button>
      </span>
    </div>
    <div class="dock-right">
      <label class="inline starter">
        <span>Starter</span>
        <select bind:value={templateToAdd} title={selectedTemplate?.blurb ?? ''}>
          {#each templates as template}
            <option value={template.id}>{template.name}</option>
          {/each}
        </select>
      </label>
      <button type="button" class="button-action" on:click={onAddTemplate}>
        <Icon name="plus" /> Add
      </button>
    </div>
  </div>
</div>

<ConfirmModal
  open={deleteOpen}
  title="Delete this set?"
  confirmLabel="Delete set"
  danger
  onCancel={() => (deleteOpen = false)}
  onConfirm={confirmDelete}
>
  <p>Delete “{activeName}”? This cannot be undone.</p>
</ConfirmModal>

<style lang="scss">
  .sets-shell {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .dock,
  .dock-left,
  .dock-right,
  .inline,
  .group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .inline {
    margin: 0;
    font-size: 0.8rem;
    font-weight: 700;
    color: #004400;
    white-space: nowrap;
  }

  select {
    font-size: 0.95rem;
    font-weight: normal;
    padding: 0.3rem 0.45rem;
    border: 1px solid #009900;
    border-radius: 0.35rem;
    background: #fff;
  }

  .dock {
    justify-content: space-between;
    flex-wrap: wrap;
    padding: 0.4rem 0.6rem;
    background: #f8fff8;
    border: 1px solid #cce8cc;
    border-radius: 0.5rem;
  }

  .dock-left,
  .dock-right,
  .group {
    flex-wrap: wrap;
  }

  .group {
    padding-left: 0.5rem;
    margin-left: 0.15rem;
    border-left: 1px solid #b5d9b5;
  }

  .dock-right {
    margin-left: auto;
  }

  .starter select {
    max-width: 12em;
  }

  .dock :global(.button-action) {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    margin: 0;
    font-size: 0.85rem;
    padding: 0.25rem 0.7rem;
  }

  button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  @media (max-width: 36em) {
    .dock,
    .dock-right {
      flex-wrap: wrap;
    }
  }
</style>
