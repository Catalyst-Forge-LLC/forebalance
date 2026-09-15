<script lang="ts">
  import { onMount } from 'svelte';
  import Icon from './Icon.svelte';

  const year = new Date().getFullYear();

  let open = false;
  let root: HTMLElement;

  function close() {
    open = false;
  }

  function toggle() {
    open = !open;
  }

  function onDocumentPointer(e: PointerEvent) {
    if (!open || !root) return;
    if (!root.contains(e.target as Node)) close();
  }

  function onDocumentKey(e: KeyboardEvent) {
    if (e.key === 'Escape' && open) close();
  }

  onMount(() => {
    document.addEventListener('pointerdown', onDocumentPointer);
    document.addEventListener('keydown', onDocumentKey);
    return () => {
      document.removeEventListener('pointerdown', onDocumentPointer);
      document.removeEventListener('keydown', onDocumentKey);
    };
  });
</script>

<div class="site-menu" bind:this={root}>
  <button
    type="button"
    class="icon-btn"
    aria-expanded={open}
    aria-haspopup="menu"
    aria-label="Site menu"
    title="About, privacy, and license"
    on:click={toggle}
  >
    <Icon name="menu" />
  </button>

  {#if open}
    <div class="panel" role="menu">
      <a role="menuitem" href="/#about" on:click={close}>
        <Icon name="about" /> About
      </a>
      <a role="menuitem" href="/#privacy" on:click={close}>
        <Icon name="privacy" /> Privacy
      </a>
      <a role="menuitem" href="/#help" on:click={close}>
        <Icon name="help" /> Help
      </a>
      <a
        role="menuitem"
        href="https://github.com/Catalyst-Forge-LLC/forebalance"
        target="_blank"
        rel="noreferrer"
        on:click={close}
      >
        Source on GitHub
      </a>
      <hr />
      <p class="legal">© 2020–{year} Catalyst Forge, LLC</p>
      <p class="legal">
        Free to use.
        <a href="https://github.com/Catalyst-Forge-LLC/forebalance/blob/main/LICENSE">MIT License</a>.
        Not financial advice.
      </p>
    </div>
  {/if}
</div>

<style lang="scss">
  @use '../scss/colors' as *;

  .site-menu {
    position: relative;
    flex-shrink: 0;
  }

  .icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin: 0;
    padding: 0.3rem 0.45rem;
    color: $clr-accent-ink;
    background: $clr-accent-soft;
    border: 1px solid $clr-border-strong;
    border-radius: 0.35rem;
    cursor: pointer;
  }

  .icon-btn[aria-expanded='true'] {
    background: $clr-accent;
    color: #fff;
    border-color: $clr-accent;
  }

  .panel {
    position: absolute;
    top: calc(100% + 0.35rem);
    right: 0;
    z-index: 40;
    box-sizing: border-box;
    width: min(18em, calc(100vw - 1.5rem));
    padding: 0.35rem;
    background: #fff;
    border: 1px solid $clr-border-strong;
    border-radius: 0.45rem;
    box-shadow: 0 0.45rem 1.2rem rgba(28, 33, 28, 0.14);
    text-align: left;
  }

  a[role='menuitem'] {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 0.5rem;
    border-radius: 0.3rem;
    color: $clr-text;
    font-size: 0.9rem;
    text-decoration: none;
  }

  a[role='menuitem']:hover {
    background: $clr-accent-soft;
    color: $clr-accent-ink;
  }

  hr {
    margin: 0.3rem 0.25rem;
    border: 0;
    border-top: 1px solid $clr-border;
  }

  .legal {
    margin: 0;
    padding: 0.25rem 0.5rem 0.35rem;
    font-size: 0.75rem;
    line-height: 1.4;
    color: $clr-muted;
  }

  .legal a {
    color: $clr-accent-ink;
  }
</style>
