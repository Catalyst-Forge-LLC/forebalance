<script lang="ts">
  import { get } from 'svelte/store';
  import { modal } from '#lib/ui/modal.ts';
  import { entrySetsStore, switchEntrySet, type EntrySet } from '#lib/data/entrySets.ts';
  import { activateEntrySet, setScenarioRaw } from '#lib/data/entriesPersistence.ts';
  import { applyMerge, planMerge } from '#lib/data/scenarioMerge.ts';
  import { rawEntriesStore } from '#lib/stores/settings.ts';
  import { extractCurrency } from '#lib/data/currencyHeader.ts';
  import { applyDisplayCurrency } from '#lib/stores/settings.ts';
  export let fork: EntrySet;
  export let original: EntrySet;
  export let onClose: () => void;
  // Freeze what the user reviewed; never apply old offsets to newer text.
  const base = typeof fork.forkBase === 'string' ? fork.forkBase : undefined;
  const changes = planMerge(base, original.raw, fork.raw);
  let selected: number[] = [];
  let saved = false;
  let stale = false;
  $: count = selected.length;
  function apply() {
    const state = get(entrySetsStore),
      parent = state.sets.find((s) => s.id === original.id),
      child = state.sets.find((s) => s.id === fork.id);
    if (!count || !parent || parent.raw !== original.raw || !child || child.raw !== fork.raw || child.parentId !== parent.id) {
      stale = true;
      return;
    }
    const next = applyMerge(parent.raw, changes, selected);
    setScenarioRaw(next, parent.id);
    if (state.activeId === parent.id && extractCurrency(next)) applyDisplayCurrency(extractCurrency(next)!);
    saved = true;
  }
  function openOriginal() {
    const target = switchEntrySet(original.id, get(rawEntriesStore));
    if (target) activateEntrySet(target.raw);
    onClose();
  }
</script>

<dialog use:modal aria-labelledby="merge-heading" on:cancel={onClose}>
  <header>
    <h2 id="merge-heading">{saved ? 'Changes merged' : 'Merge into original'}</h2>
    <p><strong>{fork.name}</strong> → <strong>{original.name}</strong></p>
  </header>
  {#if saved}
    <p role="status">Applied {count} {count === 1 ? 'change' : 'changes'} to {original.name}. Your fork is unchanged.</p>
    <footer>
      <button on:click={onClose}>Done</button>{#if $entrySetsStore.activeId !== original.id}<button class="button-action" on:click={openOriginal}
          >Open original</button
        >{/if}
    </footer>
  {:else}
    {#if !changes.length}<p>No changes to merge. The original already includes the fork’s changes.</p>
    {:else}
      <p>Choose what to copy into the original. Unchecked changes stay as they are in the original.</p>
      {#if base === undefined}<p class="notice">
          This older fork has no saved starting copy. Review each difference: it may be a later edit in the original.
        </p>{/if}
      <div class="choices">
        {#each changes as change, i (i)}
          <label>
            <input type="checkbox" bind:group={selected} value={i} />
            <span
              ><strong
                >{change.original.length === 0 ? 'Add' : change.proposed.length === 0 ? 'Remove' : 'Update'} · {(
                  change.proposed[0] ?? change.original[0]
                )?.split('|')[3] ||
                  (change.proposed[0] ?? change.original[0]) ||
                  'Blank line'}</strong
              >
              {#if change.conflict}<small class="notice"
                  >{base === undefined ? 'Review difference' : 'Both scenarios changed here — selecting this uses the fork version.'}</small
                >{/if}
              {#if change.original.length}<small>Original</small><code>{change.original.map((l) => l || '⟨blank line⟩').join('\n')}</code>{/if}
              {#if change.proposed.length}<small>Fork</small><code>{change.proposed.map((l) => l || '⟨blank line⟩').join('\n')}</code>{/if}
            </span>
          </label>
        {/each}
      </div>
    {/if}
    {#if stale}<p role="alert">A scenario changed since this preview opened. Close it and review the latest changes.</p>{/if}
    <footer>
      <button on:click={onClose}>{changes.length ? 'Cancel' : 'Close'}</button>{#if changes.length}<button
          class="button-action"
          disabled={!count || stale}
          on:click={apply}>Apply {count} {count === 1 ? 'change' : 'changes'}</button
        >{/if}
    </footer>
  {/if}
</dialog>

<style>
  dialog {
    box-sizing: border-box;
    width: min(40rem, calc(100vw - 1.5rem));
    max-height: 86dvh;
    border: 1px solid #9bac9e;
    border-radius: 0.7rem;
    padding: 1.1rem;
    color: inherit;
  }
  dialog[open] {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  dialog::backdrop {
    background: #17281e70;
  }
  h2,
  p {
    margin: 0;
  }
  header p {
    margin-top: 0.25rem;
  }
  .choices {
    min-height: 0;
    overflow: auto;
    border-block: 1px solid #ccd6cf;
  }
  label {
    display: flex;
    align-items: flex-start;
    gap: 0.6rem;
    padding: 0.65rem 0.3rem;
    text-align: left;
  }
  label + label {
    border-top: 1px solid #dee4df;
  }
  input {
    flex: none;
    width: 1.1rem;
    height: 1.1rem;
  }
  label span {
    min-width: 0;
    overflow-wrap: anywhere;
  }
  small,
  code {
    display: block;
  }
  small {
    margin-top: 0.25rem;
  }
  code {
    white-space: pre-wrap;
  }
  .notice {
    color: #795000;
  }
  footer {
    display: flex;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
</style>
