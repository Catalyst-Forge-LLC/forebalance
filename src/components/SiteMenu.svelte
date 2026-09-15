<script lang="ts">
  import { onMount } from 'svelte';
  import Icon from './Icon.svelte';

  const year = new Date().getFullYear();

  const tools = [
    {
      name: 'ForgeTrail',
      href: 'https://forgetrail.dev',
      icon: '/cf/forgetrail.png',
      blurb: 'Lifecycle and session memory',
    },
    {
      name: 'LocalSlip',
      href: 'https://localslip.dev',
      icon: '/cf/localslip.png',
      blurb: 'Dev port lease',
    },
    {
      name: 'LocalHelm',
      href: 'https://localhelm.dev',
      icon: '/cf/localhelm.png',
      blurb: 'Fleet enrollment',
    },
  ];

  let open = false;
  let toolsOpen = false;
  let root: HTMLElement;

  function close() {
    open = false;
    toolsOpen = false;
  }

  function toggle() {
    open = !open;
    if (!open) toolsOpen = false;
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
      <hr />
      <a
        role="menuitem"
        href="https://github.com/Catalyst-Forge-LLC/forebalance"
        target="_blank"
        rel="noreferrer"
        on:click={close}
      >
        <Icon name="github" /> Source on GitHub
      </a>
      <a
        role="menuitem"
        href="https://www.catalystforge.com/"
        target="_blank"
        rel="noreferrer"
        on:click={close}
      >
        <img class="mark" src="/cf/catalyst-forge.png" width="16" height="16" alt="" />
        Catalyst Forge
      </a>
      <div class="flyout-row">
        <button
          type="button"
          role="menuitem"
          aria-expanded={toolsOpen}
          on:click={() => (toolsOpen = !toolsOpen)}
        >
          <img class="mark" src="/cf/catalyst-forge.png" width="16" height="16" alt="" />
          CF tools
          <span class="chevron">▸</span>
        </button>
        {#if toolsOpen}
          <div class="submenu" role="menu">
            {#each tools as tool}
              <a
                role="menuitem"
                href={tool.href}
                target="_blank"
                rel="noreferrer"
                title={tool.blurb}
                on:click={close}
              >
                <img class="mark" src={tool.icon} width="16" height="16" alt="" />
                <span class="tool-copy">
                  <span class="tool-name">{tool.name}</span>
                  <span class="tool-blurb">{tool.blurb}</span>
                </span>
              </a>
            {/each}
          </div>
        {/if}
      </div>
      <hr />
      <p class="legal">
        © 2020–{year}
        <a href="https://www.catalystforge.com/" target="_blank" rel="noreferrer">Catalyst Forge, LLC</a>
      </p>
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

  .panel,
  .submenu {
    position: absolute;
    z-index: 40;
    box-sizing: border-box;
    min-width: 16em;
    padding: 0.35rem;
    background: #fff;
    border: 1px solid $clr-border-strong;
    border-radius: 0.45rem;
    box-shadow: 0 0.45rem 1.2rem rgba(28, 33, 28, 0.14);
    text-align: left;
  }

  .panel {
    top: calc(100% + 0.35rem);
    right: 0;
    width: min(18em, calc(100vw - 1.5rem));
  }

  .flyout-row {
    position: relative;
  }

  .submenu {
    top: 0;
    right: calc(100% + 0.25rem);
    min-width: 15em;
  }

  a[role='menuitem'],
  button[role='menuitem'] {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    width: 100%;
    margin: 0;
    padding: 0.4rem 0.5rem;
    border: 0;
    border-radius: 0.3rem;
    background: none;
    color: $clr-text;
    font-size: 0.9rem;
    text-align: left;
    text-decoration: none;
    cursor: pointer;
  }

  a[role='menuitem']:hover,
  button[role='menuitem']:hover,
  button[role='menuitem'][aria-expanded='true'] {
    background: $clr-accent-soft;
    color: $clr-accent-ink;
  }

  .mark {
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
    border-radius: 0.2rem;
    object-fit: contain;
  }

  .chevron {
    margin-left: auto;
    color: $clr-muted;
  }

  .tool-copy {
    display: flex;
    flex-direction: column;
    min-width: 0;
    line-height: 1.25;
  }

  .tool-name {
    font-weight: 600;
  }

  .tool-blurb {
    color: $clr-muted;
    font-size: 0.75rem;
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

  @media (max-width: 40em) {
    .submenu {
      position: static;
      right: auto;
      margin-top: 0.15rem;
      box-shadow: none;
    }
  }
</style>
