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
  import { ensureCurrencyHeader } from '$lib/data/currencyHeader';
  import { activateEntrySet } from '$lib/data/entriesPersistence';
  import { rawEntriesStore, settingsStore } from '$lib/stores/settings';
  import { fmt } from '$lib/formatters/fmt';
  import ConfirmModal from './ConfirmModal.svelte';
  import SetSwitcher from './SetSwitcher.svelte';

  let deleteOpen = false;

  $: canDelete = $entrySetsStore.sets.length > 1;
  $: templates = listTemplates();
  $: activeName = getActiveSet($entrySetsStore)?.name ?? 'this scenario';

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
</style>
