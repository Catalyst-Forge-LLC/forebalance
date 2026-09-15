<script lang="ts">
  import { validateRawEntries } from '$lib/parser/validateEntries';
  import { onMount } from 'svelte';
  import { logd } from '$lib/util/log';
  import { setRawEntries } from '$lib/data/entriesPersistence';
  import { rawEntriesStore } from '$lib/stores/settings';
  import {
    getLinkedFileName,
    isFileSystemAccessSupported,
    isForebalancePsvName,
    linkPsvFile,
    readImportFile,
    unlinkPsvFile,
  } from '$lib/persistence/psvPersistence';
  import Dropzone from 'svelte-file-dropzone';
  import type { EntryValidation } from '$lib/parser/validateEntries';
  import ConfirmModal from './ConfirmModal.svelte';
  import EntrySetsPanel from './EntrySetsPanel.svelte';
  import Icon from './Icon.svelte';
  import PsvEditor from './PsvEditor.svelte';
  import SyntaxHelp from './SyntaxHelp.svelte';

  let lastInputEntries = '';
  let draftEntries = '';
  let linkedFileName: string | null = null;
  let fsSupported = false;
  let importInput: HTMLInputElement;
  let validationWarnings: EntryValidation[] = [];

  let pendingName = '';
  let pendingContent = '';
  let importOpen = false;
  let unusualOpen = false;
  let linkOpen = false;

  $: if ($rawEntriesStore !== lastInputEntries) {
    lastInputEntries = $rawEntriesStore;
    draftEntries = $rawEntriesStore;
  }
  $: validationWarnings = validateRawEntries(draftEntries || $rawEntriesStore);

  onMount(() => {
    fsSupported = isFileSystemAccessSupported();
    linkedFileName = getLinkedFileName();
    lastInputEntries = $rawEntriesStore;
    draftEntries = $rawEntriesStore;
  });

  function applyRawEntries(rawEntries: string) {
    setRawEntries(rawEntries);
    logd('[set-raw-entries]', rawEntries);
    lastInputEntries = rawEntries;
    draftEntries = rawEntries;
  }

  function handleEditorDraft(inputEntries: string) {
    draftEntries = inputEntries;
  }

  function handleEditorCommit(inputEntries: string) {
    if (lastInputEntries === inputEntries) {
      return;
    }
    if (inputEntries) {
      applyRawEntries(inputEntries);
    }
  }

  function handleFilesSelect(e: CustomEvent<{ acceptedFiles: File[] }>) {
    const file = e.detail.acceptedFiles[0];
    if (file) void startImport(file);
  }

  async function startImport(file: File) {
    pendingContent = await readImportFile(file);
    pendingName = file.name;
    importOpen = true;
  }

  function confirmImport() {
    importOpen = false;
    if (!isForebalancePsvName(pendingName)) {
      unusualOpen = true;
      return;
    }
    applyPending();
  }

  function applyPending() {
    applyRawEntries(pendingContent);
    pendingName = '';
    pendingContent = '';
    unusualOpen = false;
    importOpen = false;
  }

  function clickImport() {
    importInput?.click();
  }

  async function onImportSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) await startImport(file);
    input.value = '';
  }

  async function clickLinkFile() {
    const linked = await linkPsvFile();
    if (linked) {
      linkedFileName = linked.name;
      pendingName = linked.name;
      pendingContent = linked.content;
      linkOpen = true;
    }
  }

  function confirmLink() {
    applyRawEntries(pendingContent);
    linkOpen = false;
  }

  async function clickUnlink() {
    await unlinkPsvFile();
    linkedFileName = null;
  }
</script>

<div class="entries-page">
  <EntrySetsPanel>
    <input
      bind:this={importInput}
      type="file"
      accept=".psv,.txt,text/plain"
      class="sr-only"
      on:change={onImportSelected}
    />

    <div class="editor-head">
      <p class="persist-note">
        This scenario stays in this browser on this device. Clearing site data deletes it. Export a
        <code>.psv</code> for a copy you keep. Browser storage is not a durable backup.
      </p>
      <SyntaxHelp />
    </div>
    <PsvEditor
      value={$rawEntriesStore}
      hasWarnings={validationWarnings.length > 0}
      onDraft={handleEditorDraft}
      onChange={handleEditorCommit}
    />

    {#if validationWarnings.length}
      <div class="validation-warnings" role="alert">
        <strong>Entry warnings</strong>
        <ul>
          {#each validationWarnings as warning}
            <li>Line {warning.line}: {warning.message}</li>
          {/each}
        </ul>
      </div>
    {/if}

    <div slot="files" class="file-slot">
      <button type="button" class="button-action" on:click={clickImport} title="Replace this scenario from a .psv file">
        <Icon name="import" /> Import
      </button>
      {#if fsSupported}
        <button type="button" class="button-action" on:click={clickLinkFile}>
          <Icon name="link" /> Link file…
        </button>
        {#if linkedFileName}
          <span class="linked-file">Linked: {linkedFileName}</span>
          <button type="button" class="button-link" on:click={clickUnlink}>Unlink</button>
        {/if}
      {/if}
    </div>
  </EntrySetsPanel>

  <div class="dropzone-wrap">
    <Dropzone on:drop={handleFilesSelect}>
      <p>Drop a <code>.psv</code> here to replace this scenario</p>
    </Dropzone>
  </div>
</div>

<ConfirmModal
  open={importOpen}
  title="Replace this scenario?"
  confirmLabel="Replace scenario"
  danger
  onCancel={() => (importOpen = false)}
  onConfirm={confirmImport}
>
  <p>Replace the current scenario with <strong>{pendingName}</strong>?</p>
</ConfirmModal>

<ConfirmModal
  open={unusualOpen}
  title="Import this file?"
  confirmLabel="Import anyway"
  onCancel={() => (unusualOpen = false)}
  onConfirm={applyPending}
>
  <p><strong>{pendingName}</strong> is not a <code>.psv</code> file. Import it anyway?</p>
</ConfirmModal>

<ConfirmModal
  open={linkOpen}
  title="Load the linked file?"
  confirmLabel="Load entries"
  onCancel={() => (linkOpen = false)}
  onConfirm={confirmLink}
>
  <p>Link to <strong>{pendingName}</strong> and load its entries into this scenario?</p>
</ConfirmModal>

<style lang="scss">
  @import '../scss/colors';

  .entries-page {
    max-width: 55em;
    margin: 0 auto;
    padding: 0.5rem 1rem 1rem;
  }

  .editor-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
    margin: 0.35rem 0 0;
  }

  .persist-note {
    margin: 0;
    padding: 0;
    font-size: 0.8rem;
    line-height: 1.4;
    color: $clr-muted;
    text-align: left;
  }

  .file-slot {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
  }

  .linked-file {
    font-size: 0.85rem;
    color: $clr-accent-ink;
  }

  .button-link {
    background: none;
    border: none;
    color: #666;
    cursor: pointer;
    font-size: 0.85rem;
    text-decoration: underline;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    border: 0;
  }

  .validation-warnings {
    margin: 0.5rem 0 0;
    padding: 0.5rem 0.75rem;
    text-align: left;
    background: #fff8e6;
    border: 1px solid #cc8800;
    border-radius: 0.5rem;
    font-size: 0.9rem;

    ul {
      margin: 0.25rem 0 0;
      padding-left: 1.25rem;
    }
  }

  .dropzone-wrap {
    margin-top: 0.75rem;

    :global(div[role='presentation']),
    :global(.dropzone) {
      border: 1px dashed $clr-accent !important;
      background: $clr-accent-soft !important;
      border-radius: 0.4rem !important;
      color: $clr-accent-ink;
      font-size: 0.9rem;
    }

    p {
      margin: 0;
      padding: 0;
    }
  }
</style>
