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

<section class="panel">
  <h2>Which numbers?</h2>
  <p class="help">
    Each set is its own forecast. Switch here, then edit the text below. Clone a set to try a
    what-if without losing the original.
  </p>

  <div class="fields">
    <label>
      Set
      <select
        value={$entrySetsStore.activeId}
        on:change={(e) => onSelectSet(e.currentTarget.value)}
      >
        {#each $entrySetsStore.sets as set}
          <option value={set.id}>{set.name}</option>
        {/each}
      </select>
    </label>
    <label>
      Name
      <input type="text" bind:value={draftName} on:change={commitName} on:blur={commitName} />
    </label>
  </div>

  <div class="actions">
    <button type="button" class="button-action" on:click={onClone}>Clone</button>
    <button type="button" class="button-action" on:click={onDelete} disabled={!canDelete}>
      Delete
    </button>
    <button type="button" class="button-action" on:click={downloadCurrentSet}>Download</button>
  </div>

  <div class="starter">
    <label>
      Add a starter
      <select bind:value={templateToAdd}>
        {#each templates as template}
          <option value={template.id}>{template.name}</option>
        {/each}
      </select>
    </label>
    <button type="button" class="button-action" on:click={onAddTemplate}>Add</button>
  </div>
  {#if selectedTemplate}
    <p class="blurb">{selectedTemplate.blurb}</p>
  {/if}
</section>

<style lang="scss">
  .panel {
    max-width: 55em;
    margin: 0.75rem auto 1rem;
    padding: 0.85rem 1rem 1rem;
    text-align: left;
    background: #f8fff8;
    border: 1px solid #cce8cc;
    border-radius: 0.5rem;
  }

  h2 {
    margin: 0 0 0.35rem;
    font-size: 1rem;
    color: #006600;
  }

  .help,
  .blurb {
    margin: 0 0 0.85rem;
    font-size: 0.85rem;
    color: #444;
    line-height: 1.4;
    padding: 0;
  }

  .blurb {
    margin: 0.45rem 0 0;
    color: #555;
  }

  .fields,
  .starter {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem 1rem;
    align-items: end;
  }

  .starter {
    grid-template-columns: 1fr auto;
    margin-top: 0.85rem;
  }

  label {
    display: block;
    font-size: 0.8rem;
    font-weight: 700;
    color: #004400;
  }

  select,
  input[type='text'] {
    display: block;
    width: 100%;
    margin-top: 0.25rem;
    font-size: 1rem;
    font-weight: normal;
    padding: 0.4rem 0.5rem;
    border: 1px solid #009900;
    border-radius: 0.35rem;
    box-sizing: border-box;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.85rem;
  }

  .actions :global(.button-action),
  .starter :global(.button-action) {
    display: inline-block;
    margin: 0;
  }

  button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  @media (max-width: 36em) {
    .fields,
    .starter {
      grid-template-columns: 1fr;
    }
  }
</style>
