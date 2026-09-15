<script>
	import SiteMenu from './SiteMenu.svelte';
</script>

<header>
  <div class="bar">
    <a class="brand" href="/">
      <img src="/logo.svg" width="36" height="36" alt="" />
      <span class="titles">
        <h1 class="name">ForeBalance</h1>
        <span class="tagline">Cashflow, in plain text.</span>
      </span>
    </a>
    <SiteMenu />
  </div>
</header>

<style lang="scss">
  @use '../scss/colors' as *;

  header {
    position: relative;
    z-index: 3;
    width: 100%;
    box-sizing: border-box;
    background: linear-gradient(180deg, #ffffff 0%, #f3f8f2 100%);
    border-bottom: 2px solid $clr-accent;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.85), var(--fb-shadow-bar);
  }

  .bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    width: 100%;
    max-width: var(--fb-body-max);
    box-sizing: border-box;
    margin: 0 auto;
    padding: 0.35rem 0.75rem;
  }

  @media (min-width: 61.6em) {
    .bar {
      max-width: var(--fb-header-max);
    }
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
