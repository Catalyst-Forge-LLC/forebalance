<script lang="ts">
  import { validateRawEntries } from '$lib/parser/validateEntries';
  import { onMount } from 'svelte';
  import { logd } from '$lib/util/log';
  import {
    formatHistoryLabel,
    listEntryVersions,
    type EntryVersion,
    entryHistoryStore,
  } from '$lib/data/entryHistory';
  import { listedCurrencies } from '$lib/data/currencies';
  import { ensureCurrencyHeader, extractCurrency } from '$lib/data/currencyHeader';
  import { entrySetsStore } from '$lib/data/entrySets';
  import { setRawEntries } from '$lib/data/entriesPersistence';
  import { applyDisplayCurrency, rawEntriesStore, settingsStore } from '$lib/stores/settings';
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
  import { rollRecurringStarts } from '$lib/parser/rollRecurringStarts';
  import ConfirmModal from './ConfirmModal.svelte';
  import EntriesMenu from './EntriesMenu.svelte';
  import EntrySetsPanel from './EntrySetsPanel.svelte';
  import Icon from './Icon.svelte';
  import PsvEditor from './PsvEditor.svelte';
  import SyntaxHelp from './SyntaxHelp.svelte';
  import Tooltip from './Tooltip.svelte';

  const persistTip =
    'This scenario stays in this browser on this device. Clearing site data deletes it. Export a .psv for a copy you keep. Browser storage is not a durable backup. Previous versions (last 20 edits) are kept here too.';
  const currencies = listedCurrencies();

  let lastInputEntries = '';
  let draftEntries = '';
  let linkedFileName: string | null = null;
  let fsSupported = false;
  let showDrop = false;
  let importInput: HTMLInputElement;
  let validationWarnings: EntryValidation[] = [];

  let pendingName = '';
  let pendingContent = '';
  let importOpen = false;
  let unusualOpen = false;
  let currencyOpen = false;
  let pendingCurrency = '';
  let linkOpen = false;
  let rollOpen = false;
  let restoreOpen = false;
  let pendingRestore: EntryVersion | null = null;

  $: if ($rawEntriesStore !== lastInputEntries) {
    lastInputEntries = $rawEntriesStore;
    draftEntries = $rawEntriesStore;
  }
  $: validationWarnings = validateRawEntries(draftEntries || $rawEntriesStore);
  $: rollPreview = rollRecurringStarts(draftEntries || $rawEntriesStore);
  $: versions = listEntryVersions($entrySetsStore.activeId, $entryHistoryStore);
  $: pendingFileCurrency = pendingContent ? extractCurrency(pendingContent) : null;

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
    showDrop = false;
  }

  function confirmImport() {
    importOpen = false;
    if (!isForebalancePsvName(pendingName)) {
      unusualOpen = true;
      return;
    }
    askCurrencyIfNeeded();
  }

  function applyPending() {
    unusualOpen = false;
    importOpen = false;
    askCurrencyIfNeeded();
  }

  function askCurrencyIfNeeded() {
    const marked = extractCurrency(pendingContent);
    if (marked) {
      finishImport(marked);
      return;
    }
    pendingCurrency = $settingsStore.currencyIsoCode;
    currencyOpen = true;
  }

  function finishImport(code: string) {
    const raw = ensureCurrencyHeader(pendingContent, code);
    applyRawEntries(raw);
    applyDisplayCurrency(code);
    pendingName = '';
    pendingContent = '';
    pendingCurrency = '';
    unusualOpen = false;
    importOpen = false;
    currencyOpen = false;
    linkOpen = false;
  }

  function cancelPendingImport() {
    importOpen = false;
    unusualOpen = false;
    currencyOpen = false;
    linkOpen = false;
    pendingName = '';
    pendingContent = '';
    pendingCurrency = '';
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
    linkOpen = false;
    askCurrencyIfNeeded();
  }

  async function clickUnlink() {
    await unlinkPsvFile();
    linkedFileName = null;
  }

  function confirmRollStarts() {
    applyRawEntries(rollPreview.raw);
    rollOpen = false;
  }

  function askRestore(version: EntryVersion) {
    pendingRestore = version;
    restoreOpen = true;
  }

  function confirmRestore() {
    if (pendingRestore) applyRawEntries(pendingRestore.raw);
    pendingRestore = null;
    restoreOpen = false;
  }
</script>

<div class="entries-page">
  <EntrySetsPanel>
    <div
      slot="tools"
      class="tools-slot"
      let:onClone
      let:onDelete
      let:canDelete
      let:templates
      let:onAddStarter
      let:onExport
    >
      <Tooltip content={persistTip} position="bottom">
        <button type="button" class="icon-btn" aria-label="How this is saved">
          <Icon name="info" />
        </button>
      </Tooltip>
      <SyntaxHelp />
      <EntriesMenu
        {canDelete}
        {templates}
        {versions}
        {fsSupported}
        {linkedFileName}
        canRoll={rollPreview.changed > 0}
        {onClone}
        {onDelete}
        {onExport}
        onImport={clickImport}
        onDrop={() => (showDrop = true)}
        onLink={clickLinkFile}
        onUnlink={clickUnlink}
        onRoll={() => (rollOpen = true)}
        {onAddStarter}
        onRestore={askRestore}
      />
    </div>

    <input
      bind:this={importInput}
      type="file"
      accept=".psv,.txt,text/plain"
      class="sr-only"
      on:change={onImportSelected}
    />

    <div class="editor-pane">
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
    </div>
  </EntrySetsPanel>

  {#if showDrop}
    <div class="dropzone-wrap">
      <div class="drop-head">
        <span>Drop a <code>.psv</code> to replace this scenario</span>
        <button type="button" class="button-link" on:click={() => (showDrop = false)}>Hide</button>
      </div>
      <Dropzone on:drop={handleFilesSelect}>
        <p>Drop a <code>.psv</code> here</p>
      </Dropzone>
    </div>
  {/if}
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
  {#if pendingFileCurrency}
    <p>This file is marked {pendingFileCurrency}. Forecast will show that currency.</p>
  {/if}
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
  open={currencyOpen}
  title="Which currency?"
  confirmLabel="Use this currency"
  onCancel={cancelPendingImport}
  onConfirm={() => finishImport(pendingCurrency)}
>
  <p>
    <strong>{pendingName}</strong> does not say which currency the amounts are in.
    ForeBalance will not convert the numbers — it only changes how they look.
  </p>
  <label class="currency-pick">
    Use
    <select bind:value={pendingCurrency}>
      {#each currencies as option}
        <option value={option.code}>{option.label}</option>
      {/each}
    </select>
  </label>
</ConfirmModal>

<ConfirmModal
  open={linkOpen}
  title="Load the linked file?"
  confirmLabel="Load entries"
  onCancel={() => (linkOpen = false)}
  onConfirm={confirmLink}
>
  <p>Link to <strong>{pendingName}</strong> and load its entries into this scenario?</p>
  {#if pendingFileCurrency}
    <p>This file is marked {pendingFileCurrency}. Forecast will show that currency.</p>
  {/if}
</ConfirmModal>

<ConfirmModal
  open={rollOpen}
  title="Bring recurring dates forward?"
  confirmLabel="Update dates"
  onCancel={() => (rollOpen = false)}
  onConfirm={confirmRollStarts}
>
  <p>
    Recurring lines still walk every occurrence from the date in the text, even though Forecast
    drops rows before the <code>B</code> line. This rewrites unbounded series so they start
    <strong>one period before</strong> that balance date (or today, if there is no balance line).
    Cadence, amounts, and end dates stay the same. Counted series like <code>RW5</code> are left
    alone.
  </p>
  <p>{rollPreview.changed} line{rollPreview.changed === 1 ? '' : 's'} would change in this scenario:</p>
  <ul class="roll-examples">
    {#each rollPreview.examples as change}
      <li><strong>{change.desc}</strong>: <code>{change.from}</code> → <code>{change.to}</code></li>
    {/each}
  </ul>
</ConfirmModal>

<ConfirmModal
  open={restoreOpen}
  title="Restore this version?"
  confirmLabel="Restore"
  onCancel={() => {
    restoreOpen = false;
    pendingRestore = null;
  }}
  onConfirm={confirmRestore}
>
  {#if pendingRestore}
    <p>
      Replace the current text with the version from
      <strong>{formatHistoryLabel(pendingRestore.at)}</strong>? The text you have now is kept under
      Previous versions.
    </p>
  {/if}
</ConfirmModal>

<style lang="scss">
  @use '../scss/colors' as *;

  .entries-page {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    max-width: 55em;
    width: 100%;
    margin: 0 auto;
    padding: 0.5rem 1rem 0.75rem;
    overflow: hidden;
  }

  .tools-slot {
    display: contents;
  }

  .editor-pane {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }

  .icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin: 0;
    padding: 0.28rem 0.45rem;
    color: $clr-accent-ink;
    background: $clr-accent-soft;
    border: 1px solid $clr-border-strong;
    border-radius: 0.35rem;
    cursor: pointer;
  }

  .roll-examples {
    margin: 0.35rem 0 0;
    padding-left: 1.2rem;
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
    flex-shrink: 0;
    margin-top: 0.5rem;
  }

  .drop-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.35rem;
    font-size: 0.8rem;
    color: $clr-muted;
  }

  .dropzone-wrap :global(div[role='presentation']),
  .dropzone-wrap :global(.dropzone) {
    border: 1px dashed $clr-accent !important;
    background: $clr-accent-soft !important;
    border-radius: 0.4rem !important;
    color: $clr-accent-ink;
    font-size: 0.9rem;
  }

  .dropzone-wrap p {
    margin: 0;
    padding: 0;
  }

  .currency-pick {
    display: block;
    margin: 0.75rem 0 0;
    font-weight: 700;

    select {
      display: block;
      width: 100%;
      margin-top: 0.35rem;
      padding: 0.35rem 0.5rem;
      font-size: 1rem;
      font-weight: 400;
    }
  }
</style>
