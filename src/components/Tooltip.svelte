<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import tippy, { type Instance, type Props } from 'tippy.js';
  import 'tippy.js/dist/tippy.css'; // Import default Tippy styles

  // Props
  export let content: string | null = ''; // Tooltip content
  export let position = 'top';
  export let theme = 'light';

  let element: HTMLElement; // Reference to the wrapped element, typed as HTMLElement
  let tippyInstance: Instance<Props>; // Single Tippy instance

  // Initialize Tippy when component mounts
  onMount(() => {
    if (element && content) {
      tippyInstance = tippy(element, {
        content,
        placement: position,
        duration: [300, 200],
        theme,
        allowHTML: true,
        arrow: true,
        appendTo: () => document.body, // Ensures it escapes overflow
      });
    }
  });

  // Cleanup on destroy
  onDestroy(() => {
    if (tippyInstance) {
      tippyInstance.destroy();
    }
  });
</script>

<div bind:this={element} class="tooltip-wrapper">
  <slot></slot>
</div>

<style>
  .tooltip-wrapper {
    display: inline-block; /* Ensures proper positioning */
  }
</style>
