<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { EditorView, basicSetup } from 'codemirror';
  import { EditorState } from '@codemirror/state';
  import { psvLinter, psvTheme } from '$lib/editor/psvExtensions';

  export let value = '';
  export let onChange: (value: string) => void = () => {};
  export let hasWarnings = false;

  let container: HTMLDivElement;
  let view: EditorView | undefined;
  let internalUpdate = false;

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
            if (update.docChanged) {
              internalUpdate = true;
              onChange(update.state.doc.toString());
              internalUpdate = false;
            }
          }),
        ],
      }),
    });
  });

  onDestroy(() => {
    view?.destroy();
  });

  $: if (view && !internalUpdate && value !== view.state.doc.toString()) {
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: value },
    });
  }

  $: container?.classList.toggle('has-warnings', hasWarnings);
</script>

<div bind:this={container} class="psv-editor" class:has-warnings={hasWarnings}></div>

<style lang="scss">
  .psv-editor {
    max-width: 55em;
    margin: 0.5rem auto 0;
    text-align: left;

    &.has-warnings :global(.cm-editor) {
      border-color: #cc8800;
      box-shadow: 0 0 0 2px #cc880033;
    }
  }
</style>
