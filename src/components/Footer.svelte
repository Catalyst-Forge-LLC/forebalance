<footer>
  <p>&copy;2020-{new Date().getFullYear()} Catalyst Forge, LLC</p>
  <p class="terms">Free to use. MIT License. Not financial advice.</p>
</footer>

<style lang="scss">
  @use '../scss/colors' as *;

  footer {
    bottom: 0;
    left: 0;
    width: 100%;
    z-index: 1000;
    text-align: center;
    background: $clr-surface;
    color: $clr-text;
    font-size: 0.85rem;
    font-weight: 400;
    margin-top: 0;
    display: block;
    padding: 0.55rem 0.75rem 0.7rem;
    border-top: 3px solid $clr-accent;
  }

  p {
    margin: 0;
    padding: 0;
  }

  .terms {
    margin-top: 0.15rem;
    color: $clr-muted;
    font-size: 0.75rem;
  }
</style>
