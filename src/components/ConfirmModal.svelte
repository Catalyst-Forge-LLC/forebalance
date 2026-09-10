<script lang="ts">
  export let open = false;
  export let title = 'Confirm';
  export let confirmLabel = 'Confirm';
  export let danger = false;
  export let onCancel: () => void = () => {};
  export let onConfirm: () => void = () => {};

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
  <dialog class:danger use:show on:close={onCancel} on:cancel={onCancel}>
    <h2>{title}</h2>
    <div class="body">
      <slot />
    </div>
    <div class="actions">
      <button type="button" class="button-action cancel" on:click={onCancel}>Cancel</button>
      <button type="button" class="button-action" class:destroy={danger} on:click={onConfirm}>
        {confirmLabel}
      </button>
    </div>
  </dialog>
{/if}

<style lang="scss">
  dialog {
    width: min(28em, calc(100vw - 2rem));
    padding: 1.15rem 1.25rem 1.25rem;
    border: 2px solid #006600;
    border-radius: 0.6rem;
    box-shadow: 0 0.5rem 1.5rem rgba(0, 0, 0, 0.35);
    text-align: left;
  }

  dialog.danger {
    border-color: #aa3300;
  }

  dialog::backdrop {
    background: rgba(0, 0, 0, 0.45);
  }

  h2 {
    margin: 0 0 0.6rem;
    font-size: 1.15rem;
    color: #006600;
  }

  .danger h2 {
    color: #aa3300;
  }

  .body {
    margin: 0 0 1rem;
    line-height: 1.45;
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

  .cancel {
    background-color: #666 !important;
  }

  .destroy {
    background-color: #aa3300 !important;
  }
</style>
