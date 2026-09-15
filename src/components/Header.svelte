<script>
	import SiteMenu from './SiteMenu.svelte';
</script>

<header>
  <a class="brand" href="/">
    <img src="/logo.svg" width="36" height="36" alt="" />
    <span class="titles">
      <h1 class="name">ForeBalance</h1>
      <span class="tagline">Cashflow, in plain text.</span>
    </span>
  </a>
  <SiteMenu />
</header>

<style lang="scss">
  @use '../scss/colors' as *;

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    width: 100%;
    box-sizing: border-box;
    padding: 0.35rem 0.75rem;
    background: $clr-surface;
    border-bottom: 2px solid $clr-accent;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    min-width: 0;
    color: $clr-accent;
    text-decoration: none;
  }

  img {
    width: 2rem;
    height: 2rem;
    flex-shrink: 0;
    border-radius: 0.35rem;
  }

  .titles {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    min-width: 0;
    line-height: 1.15;
  }

  .name {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
  }

  .tagline {
    color: $clr-muted;
    font-size: 0.78rem;
    font-weight: 400;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  @media (max-width: 28em) {
    .tagline {
      display: none;
    }
  }
</style>
