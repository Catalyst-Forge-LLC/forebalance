<script lang="ts">
  import { THRESHOLD_MARKS } from '$lib/formatters/thresholdMarks';

  export let compact = false;
</script>

<div class="legend" class:compact>
  <p class="intro">
    Threshold marks stay on the row even if color is hard to see. Change the amounts on Settings.
  </p>
  <ul>
    {#each THRESHOLD_MARKS as item}
      <li class="flag-{item.id}">
        <span class="mark" aria-hidden="true">{item.mark}</span>
        <span class="label">{item.label}</span>
        {#if !compact}
          <span class="meaning">{item.meaning}</span>
        {/if}
      </li>
    {/each}
  </ul>
</div>

<style lang="scss">
  @use '../scss/colors' as *;

  .legend {
    margin: 0 0 0.75rem;
    padding: 0.55rem 0.7rem;
    background: $clr-surface;
    border: 1px solid $clr-border;
    border-radius: 0.4rem;
    text-align: left;
  }

  .intro {
    margin: 0 0 0.4rem;
    padding: 0;
    font-size: 0.8rem;
    color: $clr-muted;
  }

  ul {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem 0.85rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: inline-flex;
    align-items: baseline;
    gap: 0.3rem;
    font-size: 0.8rem;
    font-weight: 700;
  }

  .meaning {
    font-weight: 500;
    color: $clr-muted;
  }

  .flag-goal {
    color: $clr-goal-ink;
  }
  .flag-uncomfortable {
    color: $clr-uncomf-ink;
  }
  .flag-low {
    color: $clr-low-ink;
  }
  .flag-negative {
    color: $clr-negative-ink;
  }
  .flag-paid-off {
    color: $clr-paidoff-ink;
  }

  .compact {
    padding: 0.4rem 0.5rem;

    .intro {
      display: none;
    }
  }
</style>
