<header>
  <h1>
    <a href="/">
      <img src="/logo.svg" width="48" height="48" alt="" />
      ForeBalance
    </a>
  </h1>
</header>

<style lang="scss">
  @use '../scss/colors' as *;

  header {
    top: 0;
    left: 0;
    width: 100%;
    background: $clr-surface;
    border-bottom: 3px solid $clr-accent;

    h1 {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.6rem;
      text-align: center;
      color: $clr-accent;
      font-size: calc(min(7vw, 2.4rem));
      font-weight: 600;
      line-height: 1.15;
      margin: 0;
      padding: 0.55rem 0;
    }

    a {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.6rem;
      color: inherit;
      text-decoration: none;
    }

    img {
      width: calc(min(10vw, 2.4rem));
      height: calc(min(10vw, 2.4rem));
      border-radius: 0.45rem;
    }
  }
</style>
