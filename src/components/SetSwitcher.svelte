<script lang="ts">
  import {
    entrySetsStore,
    renameEntrySet,
    switchEntrySet,
  } from '$lib/data/entrySets';
  import { activateEntrySet } from '$lib/data/entriesPersistence';
  import { rawEntriesStore } from '$lib/stores/settings';

  export let editable = true;

  let draftName = '';
  let lastActiveId = '';

  $: activeSet = $entrySetsStore.sets.find((set) => set.id === $entrySetsStore.activeId);
  $: if (activeSet && activeSet.id !== lastActiveId) {
    lastActiveId = activeSet.id;
    draftName = activeSet.name;
  }

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
</script>

<div class="bar" class:compact={!editable}>
  <label class="inline">
    <span>Scenario</span>
    <select
      value={$entrySetsStore.activeId}
      on:change={(e) => onSelectSet(e.currentTarget.value)}
    >
      {#each $entrySetsStore.sets as set}
        <option value={set.id}>{set.name}</option>
      {/each}
    </select>
  </label>
  {#if editable}
    <label class="inline name">
      <span>Name</span>
      <input type="text" bind:value={draftName} on:change={commitName} on:blur={commitName} />
    </label>
  {/if}
  <slot name="extra" />
</div>

<style lang="scss">
  @use '../scss/colors' as *;

  .bar,
  .inline {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .bar {
    padding: 0.4rem 0.6rem;
    background: $clr-surface;
    border: 1px solid $clr-border;
    border-radius: 0.4rem;
  }

  .compact {
    max-width: 55em;
    width: calc(100% - 2rem);
    margin: 0.4rem auto 0.35rem;
    flex-wrap: wrap;
  }

  .inline {
    margin: 0;
    font-size: 0.8rem;
    font-weight: 700;
    color: $clr-accent-ink;
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
    border: 1px solid $clr-border-strong;
    border-radius: 0.35rem;
    background: #fff;
  }

  .name input {
    flex: 1;
    min-width: 0;
    width: 100%;
  }

  @media (max-width: 36em) {
    .bar {
      flex-wrap: wrap;
    }

    .name,
    .name input {
      width: 100%;
    }
  }
</style>
