<script lang="ts">
  import { onDestroy } from 'svelte';
  import tippy, { type Instance, type Props } from 'tippy.js';
  import 'tippy.js/dist/tippy.css';

  export let content: string | null = '';
  export let position = 'top';
  export let theme = 'light';

  let element: HTMLElement;
  let tippyInstance: Instance<Props> | undefined;

  function ensureTippy() {
    if (!content || !element || tippyInstance) return;
    tippyInstance = tippy(element, {
      content,
      placement: position as Props['placement'],
      duration: [300, 200],
      theme,
      allowHTML: true,
      arrow: true,
      appendTo: () => document.body,
    });
  }

  $: if (tippyInstance && content) {
    tippyInstance.setContent(content);
  }

  onDestroy(() => {
    tippyInstance?.destroy();
  });
</script>

<div
  bind:this={element}
  class="tooltip-wrapper"
  role="group"
  on:pointerenter={ensureTippy}
>
  <slot></slot>
</div>

<style>
  .tooltip-wrapper {
    display: inline-block;
  }
</style>
