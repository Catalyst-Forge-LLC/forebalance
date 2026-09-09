<script lang="ts">
  import { fmt } from '$lib/formatters/fmt';
  import {
    addSetFromTemplate,
    cloneEntrySet,
    deleteEntrySet,
    entrySetsStore,
    listTemplates,
    renameEntrySet,
    switchEntrySet,
    updateActiveRaw,
  } from '$lib/data/entrySets';
  import { activateEntrySet } from '$lib/data/entriesPersistence';
  import { rawEntriesStore } from '$lib/stores/settings';

  let draftName = '';
  let lastActiveId = '';
  let templateToAdd = listTemplates()[0]?.id ?? 'close-month';

  $: activeSet = $entrySetsStore.sets.find((set) => set.id === $entrySetsStore.activeId);
  $: if (activeSet && activeSet.id !== lastActiveId) {
    lastActiveId = activeSet.id;
    draftName = activeSet.name;
  }
  $: canDelete = $entrySetsStore.sets.length > 1;
  $: templates = listTemplates();
  $: selectedTemplate = templates.find((template) => template.id === templateToAdd);

  function onSelectSet(id: string) {
    if (id === $entrySetsStore.activeId) return;
    const next = switchEntrySet(id, $rawEntriesStore);
    if (next) {
      lastActiveId = next.id;
      activateEntrySet(next.raw);
      draftName = next.name;
    }
  }

  function commitName() {
    if (!activeSet) return;
    const next = renameEntrySet(activeSet.id, draftName);
    const renamed = next.sets.find((set) => set.id === activeSet.id);
    draftName = renamed?.name ?? draftName;
  }

  function onClone() {
    if (!activeSet) return;
    updateActiveRaw($rawEntriesStore);
    const clone = cloneEntrySet(activeSet.id);
    lastActiveId = clone.id;
    activateEntrySet(clone.raw);
    draftName = clone.name;
  }

  function onDelete() {
    if (!activeSet || !canDelete) return;
    if (!confirm(`Delete “${activeSet.name}”? This cannot be undone.`)) return;
    const next = deleteEntrySet(activeSet.id);
    const selected = next.sets.find((set) => set.id === next.activeId);
    if (selected) {
      lastActiveId = selected.id;
      activateEntrySet(selected.raw);
      draftName = selected.name;
    }
  }

  function onAddTemplate() {
    updateActiveRaw($rawEntriesStore);
    const added = addSetFromTemplate(templateToAdd);
    lastActiveId = added.id;
    activateEntrySet(added.raw);
    draftName = added.name;
  }

  function downloadCurrentSet() {
    const slug = (activeSet?.name ?? 'entries').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const element = document.createElement('a');
    element.setAttribute(
      'href',
      'data:text/plain;charset=utf-8,' + encodeURIComponent($rawEntriesStore),
    );
    element.setAttribute('download', `forebalance-${fmt.date3()}-${slug}.psv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }
</script>

<div class="sets-shell">
  <div class="bar">
    <label class="inline">
      <span>Set</span>
      <select
        value={$entrySetsStore.activeId}
        on:change={(e) => onSelectSet(e.currentTarget.value)}
      >
        {#each $entrySetsStore.sets as set}
          <option value={set.id}>{set.name}</option>
        {/each}
      </select>
    </label>
    <label class="inline name">
      <span>Name</span>
      <input type="text" bind:value={draftName} on:change={commitName} on:blur={commitName} />
    </label>
  </div>

  <slot />

  <div class="dock">
    <div class="dock-left">
      <button type="button" class="button-action" on:click={onClone}>Clone</button>
      <button type="button" class="button-action" on:click={onDelete} disabled={!canDelete}>
        Delete
      </button>
      <span class="group" title="This set only — not every set you have">
        <slot name="files" />
        <button type="button" class="button-action" on:click={downloadCurrentSet}>Export</button>
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
      <button type="button" class="button-action" on:click={onAddTemplate}>Add</button>
    </div>
  </div>
</div>

<style lang="scss">
  .sets-shell {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .bar,
  .dock,
  .dock-left,
  .dock-right,
  .inline {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .bar {
    padding: 0.4rem 0.6rem;
    background: #f8fff8;
    border: 1px solid #cce8cc;
    border-radius: 0.5rem;
  }

  .inline {
    margin: 0;
    font-size: 0.8rem;
    font-weight: 700;
    color: #004400;
    white-space: nowrap;

    span {
      flex-shrink: 0;
    }
  }

  .name {
    flex: 1;
    min-width: 0;
  }

  select,
  input[type='text'] {
    font-size: 0.95rem;
    font-weight: normal;
    padding: 0.3rem 0.45rem;
    border: 1px solid #009900;
    border-radius: 0.35rem;
    background: #fff;
  }

  .name input {
    flex: 1;
    min-width: 0;
    width: 100%;
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
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
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

  .bar :global(.button-action),
  .dock :global(.button-action) {
    display: inline-block;
    margin: 0;
    font-size: 0.85rem;
    padding: 0.25rem 0.7rem;
  }

  button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  @media (max-width: 36em) {
    .bar,
    .dock,
    .dock-right {
      flex-wrap: wrap;
    }

    .name,
    .name input {
      width: 100%;
    }
  }
</style>
