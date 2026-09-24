<script lang="ts">
  import {
    addSetFromTemplate,
    deleteEntrySet,
    downloadTextFile,
    entrySetsStore,
    forkEntrySet,
    getActiveSet,
    listTemplates,
    uniqueSetName,
    updateActiveRaw,
  } from '$lib/data/entrySets';
  import { ensureCurrencyHeader } from '$lib/data/currencyHeader';
  import { activateEntrySet } from '$lib/data/entriesPersistence';
  import { rawEntriesStore, settingsStore } from '$lib/stores/settings';
  import { fmt } from '$lib/formatters/fmt';
  import ConfirmModal from './ConfirmModal.svelte';
  import SetSwitcher from './SetSwitcher.svelte';

  let deleteOpen = false;
  let forkOpen = false;
  let forkName = '';
  let forkDescription = '';

  $: canDelete = $entrySetsStore.sets.length > 1;
  $: templates = listTemplates();
  $: activeName = getActiveSet($entrySetsStore)?.name ?? 'this scenario';

  function onClone() {
    updateActiveRaw($rawEntriesStore);
    const source = getActiveSet($entrySetsStore);
    forkName = uniqueSetName(`${source.name} what-if`, $entrySetsStore.sets);
    forkDescription = '';
    forkOpen = true;
  }

  function confirmFork() {
    const name = forkName.trim();
    if (!name) return;
    updateActiveRaw($rawEntriesStore);
    const fork = forkEntrySet($entrySetsStore.activeId, name, forkDescription);
    activateEntrySet(fork.raw);
    forkOpen = false;
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

  function onAddStarter(templateId: string) {
    updateActiveRaw($rawEntriesStore);
    const added = addSetFromTemplate(templateId);
    activateEntrySet(added.raw);
  }

  function downloadCurrentSet() {
    const slug = activeName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    downloadTextFile(
      `forebalance-${fmt.date3()}-${slug}.psv`,
      ensureCurrencyHeader($rawEntriesStore, $settingsStore.currencyIsoCode),
    );
  }
</script>

<div class="sets-shell">
  <SetSwitcher>
    <div slot="extra" class="tools">
      <slot
        name="tools"
        {onClone}
        {onDelete}
        {canDelete}
        {templates}
        {onAddStarter}
        onExport={downloadCurrentSet}
      />
    </div>
  </SetSwitcher>

  <slot />
</div>

<ConfirmModal
  open={deleteOpen}
  title="Delete this scenario?"
  confirmLabel="Delete scenario"
  danger
  onCancel={() => (deleteOpen = false)}
  onConfirm={confirmDelete}
>
  <p>Delete “{activeName}”? This cannot be undone.</p>
</ConfirmModal>

{#if forkOpen}
  <div class="fork-backdrop" role="presentation" on:click={() => (forkOpen = false)}></div>
  <form class="fork-dialog" role="dialog" aria-label="Fork what-if" on:submit|preventDefault={confirmFork}>
    <h3>Fork what-if</h3>
    <label>
      Name
      <input bind:value={forkName} required />
    </label>
    <label>
      Description
      <input bind:value={forkDescription} placeholder="if I pay extra on the card" />
    </label>
    <div class="fork-actions">
      <button type="button" on:click={() => (forkOpen = false)}>Cancel</button>
      <button type="submit" class="button-action">Fork</button>
    </div>
  </form>
{/if}

<style lang="scss">
  .sets-shell {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    gap: 0.5rem;
  }

  .tools {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .fork-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(28, 33, 28, 0.35);
    z-index: 20;
  }

  .fork-dialog {
    position: fixed;
    z-index: 21;
    left: 50%;
    top: 18vh;
    transform: translateX(-50%);
    width: min(24rem, calc(100% - 1.5rem));
    background: #fff;
    border-radius: 0.5rem;
    padding: 0.9rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    text-align: left;

    h3 { margin: 0; }
    label { display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.85rem; }
    input { font: inherit; padding: 0.35rem 0.45rem; }
  }

  .fork-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.4rem;
  }
</style>
