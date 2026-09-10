<script lang="ts">
  import { exportAllSetsBackup } from '$lib/data/entrySets';
  import { rawEntriesStore } from '$lib/stores/settings';

  export let open = false;
  export let onCancel: () => void = () => {};
  export let onConfirm: () => void = () => {};

  const REQUIRED = 'RESET';
  let typed = '';
  let exported = false;

  $: if (!open) {
    typed = '';
    exported = false;
  }

  $: canConfirm = typed.trim().toUpperCase() === REQUIRED;

  function exportFirst() {
    exportAllSetsBackup($rawEntriesStore);
    exported = true;
  }

  function confirmReset() {
    if (!canConfirm) return;
    onConfirm();
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onCancel();
  }

  function focusConfirm(el: HTMLInputElement) {
    el.focus();
  }
</script>

<svelte:window on:keydown={onKeydown} />

{#if open}
  <div class="backdrop" role="presentation" on:click={onCancel}></div>
  <div
    class="modal"
    role="dialog"
    aria-modal="true"
    aria-labelledby="reset-title"
  >
    <h2 id="reset-title">Reset everything?</h2>
    <p>
      This deletes <strong>every entry set</strong> and restores the four 2026 starters plus default
      thresholds. It cannot be undone.
    </p>
    <p class="warn">Export a backup first if you might want these numbers again.</p>

    <button type="button" class="button-action export" on:click={exportFirst}>
      Export all sets first
    </button>
    {#if exported}
      <p class="ok">Downloaded <code>forebalance-all-sets-*.json</code>.</p>
    {/if}

    <label>
      Type <strong>{REQUIRED}</strong> to confirm
      <input
        type="text"
        bind:value={typed}
        autocomplete="off"
        spellcheck="false"
        placeholder={REQUIRED}
        use:focusConfirm
      />
    </label>

    <div class="actions">
      <button type="button" class="button-action cancel" on:click={onCancel}>Cancel</button>
      <button type="button" class="button-action destroy" disabled={!canConfirm} on:click={confirmReset}>
        Reset all sets
      </button>
    </div>
  </div>
{/if}

<style lang="scss">
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    z-index: 40;
  }

  .modal {
    position: fixed;
    z-index: 41;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: min(32em, calc(100vw - 2rem));
    padding: 1.15rem 1.25rem 1.25rem;
    background: #fff;
    border: 2px solid #aa3300;
    border-radius: 0.6rem;
    box-shadow: 0 0.5rem 1.5rem rgba(0, 0, 0, 0.35);
    text-align: left;
  }

  h2 {
    margin: 0 0 0.6rem;
    color: #aa3300;
    font-size: 1.2rem;
  }

  p {
    margin: 0 0 0.65rem;
    padding: 0;
    line-height: 1.45;
  }

  .warn {
    color: #663300;
    font-weight: 600;
  }

  .ok {
    color: #006600;
    font-size: 0.9rem;
  }

  label {
    display: block;
    margin: 1rem 0 0.75rem;
    font-size: 0.9rem;
  }

  input {
    display: block;
    width: 100%;
    margin-top: 0.35rem;
    padding: 0.4rem 0.5rem;
    font-size: 1rem;
    box-sizing: border-box;
    border: 1px solid #aa3300;
    border-radius: 0.35rem;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: flex-end;
  }

  .modal :global(.button-action) {
    display: inline-block;
    margin: 0;
  }

  .export {
    background-color: #006600 !important;
  }

  .cancel {
    background-color: #666 !important;
  }

  .destroy {
    background-color: #aa3300 !important;
  }

  .destroy:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
</style>
