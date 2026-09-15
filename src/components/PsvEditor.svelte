<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { EditorView, basicSetup } from 'codemirror';
  import { EditorState } from '@codemirror/state';
  import { psvLinter, psvTheme } from '$lib/editor/psvExtensions';

  export let value = '';
  /** Fired on blur and after typing pauses — use this to persist / reparse. */
  export let onChange: (value: string) => void = () => {};
  /** Fired on every edit for cheap local UI (warnings). Do not parse the forecast here. */
  export let onDraft: (value: string) => void = () => {};
  export let hasWarnings = false;
  export let commitDelayMs = 600;

  let container: HTMLDivElement;
  let view: EditorView | undefined;
  let focused = false;
  let commitTimer: ReturnType<typeof setTimeout> | undefined;

  function currentDoc(): string {
    return view?.state.doc.toString() ?? value;
  }

  function flushCommit() {
    if (commitTimer) {
      clearTimeout(commitTimer);
      commitTimer = undefined;
    }
    onChange(currentDoc());
  }

  function scheduleCommit() {
    if (commitTimer) clearTimeout(commitTimer);
    commitTimer = setTimeout(() => {
      commitTimer = undefined;
      onChange(currentDoc());
    }, commitDelayMs);
  }

  onMount(() => {
    view = new EditorView({
      parent: container,
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          psvTheme(),
          psvLinter(),
          EditorView.updateListener.of((update) => {
            if (!update.docChanged) return;
            const next = update.state.doc.toString();
            onDraft(next);
            scheduleCommit();
          }),
          EditorView.domEventHandlers({
            blur: () => {
              focused = false;
              flushCommit();
            },
            focus: () => {
              focused = true;
            },
          }),
        ],
      }),
    });
  });

  onDestroy(() => {
    flushCommit();
    view?.destroy();
  });

  $: if (view && !focused && value !== view.state.doc.toString()) {
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: value },
    });
  }

  $: container?.classList.toggle('has-warnings', hasWarnings);
</script>

<div bind:this={container} class="psv-editor" class:has-warnings={hasWarnings}></div>

<style lang="scss">
  .psv-editor {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 12em;
    max-width: none;
    margin: 0.5rem 0 0;
    text-align: left;
    overflow: hidden;

    :global(.cm-editor) {
      flex: 1;
      height: 100%;
      min-height: 0;
    }

    :global(.cm-scroller) {
      overflow: auto;
    }

    /* CM paints the selection layer at z-index: -2, under the active-line fill. */
    :global(.cm-selectionLayer) {
      z-index: 2 !important;
    }

    :global(.cm-selectionBackground) {
      background: rgba(0, 140, 0, 0.5) !important;
    }

    :global(.cm-content ::selection) {
      background-color: rgba(0, 140, 0, 0.5);
      color: #111;
    }

    &.has-warnings :global(.cm-editor) {
      border-color: #cc8800;
      box-shadow: 0 0 0 2px #cc880033;
    }
  }
</style>
