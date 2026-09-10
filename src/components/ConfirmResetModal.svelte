<script lang="ts">
  import { exportAllSetsBackup } from '$lib/data/entrySets';
  import { rawEntriesStore } from '$lib/stores/settings';
  import Icon from './Icon.svelte';

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

  function focusConfirm(el: HTMLInputElement) {
    el.focus();
  }

  function show(node: HTMLDialogElement) {
    node.showModal();
    return {
      destroy() {
        if (node.open) node.close();
      },
    };
  }
</script>

{#if open}
<dialog use:show on:close={onCancel} on:cancel={onCancel}>
  <h2 id="reset-title">Reset everything?</h2>
  <p>
    This deletes <strong>every scenario</strong> and restores the four starters plus default
    thresholds. It cannot be undone.
  </p>
  <p class="warn">Export a backup first if you might want these numbers again.</p>

  <button type="button" class="button-action export" on:click={exportFirst}>
    <Icon name="download" /> Export every scenario first
  </button>
  {#if exported}
    <p class="ok">Downloaded <code>forebalance-all-sets-*.json</code> (every scenario).</p>
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
      Reset all scenarios
    </button>
    </div>
  </dialog>
{/if}

<style lang="scss">
  dialog {
    width: min(32em, calc(100vw - 2rem));
    padding: 1.15rem 1.25rem 1.25rem;
    background: #fff;
    border: 2px solid #aa3300;
    border-radius: 0.6rem;
    box-shadow: 0 0.5rem 1.5rem rgba(0, 0, 0, 0.35);
    text-align: left;
  }

  dialog::backdrop {
    background: rgba(0, 0, 0, 0.45);
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

  dialog :global(.button-action) {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
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
