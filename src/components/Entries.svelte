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
  import EntrySetsPanel from './EntrySetsPanel.svelte';
  import PsvEditor from './PsvEditor.svelte';

  let lastInputEntries = '';
  let draftEntries = '';
  let linkedFileName: string | null = null;
  let fsSupported = false;
  let importInput: HTMLInputElement;
  let validationWarnings: EntryValidation[] = [];

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
    e.detail.acceptedFiles.forEach((file) => importFile(file, true));
  }

  async function importFile(file: File, confirmReplace = true) {
    const content = await readImportFile(file);
    if (confirmReplace && !confirm('Replace the current entry set with this file?')) {
      return;
    }
    if (!isForebalancePsvName(file.name) && !confirm(`Import "${file.name}" anyway?`)) {
      return;
    }
    applyRawEntries(content);
  }

  function clickImport() {
    importInput?.click();
  }

  async function onImportSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      await importFile(file, true);
    }
    input.value = '';
  }

  async function clickLinkFile() {
    const linked = await linkPsvFile();
    if (linked) {
      linkedFileName = linked.name;
      if (confirm(`Link to "${linked.name}" and load its entries?`)) {
        applyRawEntries(linked.content);
      }
    }
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
      <button type="button" class="button-action" on:click={clickImport} title="Replace this set from a .psv file">Import</button>
      {#if fsSupported}
        <button type="button" class="button-action" on:click={clickLinkFile}>Link file…</button>
        {#if linkedFileName}
          <span class="linked-file">Linked: {linkedFileName}</span>
          <button type="button" class="button-link" on:click={clickUnlink}>Unlink</button>
        {/if}
      {/if}
    </div>
  </EntrySetsPanel>

  <Dropzone on:drop={handleFilesSelect} />
</div>

<style lang="scss">
  .entries-page {
    max-width: 55em;
    margin: 0 auto;
    padding: 0.5rem 1rem 1rem;
  }

  .file-slot {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
  }

  .linked-file {
    font-size: 0.85rem;
    color: #006600;
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
</style>
