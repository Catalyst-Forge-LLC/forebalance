<script lang="ts">
  export let title: string;
  export let description = '';
  export let items: { id: string; label: string }[] = [];
  export let active = '';
  export let onSelect: (id: string) => void = () => {};
  let body: HTMLDivElement;
  function select(id: string) {
    active = id;
    if (body) body.scrollTop = 0;
    onSelect(id);
  }
</script>

<section class="workspace" aria-label={title}>
  <header>
    <h1>{title}</h1>
    <p>{description}</p>
  </header>
  <div class="workspace-grid">
    <nav aria-label="{title} sections">
      <label class="mobile-select"
        >{title} section
        <select value={active} on:change={(event) => select(event.currentTarget.value)}>
          {#each items as item (item.id)}<option value={item.id}>{item.label}</option>{/each}
        </select>
      </label>
      <div class="section-list">
        {#each items as item (item.id)}
          <button type="button" aria-current={active === item.id ? 'true' : undefined} on:click={() => select(item.id)}>{item.label}</button>
        {/each}
      </div>
    </nav>
    <!-- Keyboard focus enables native scrolling of long detail sections. -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div class="detail" bind:this={body} tabindex="0" role="region" aria-label="{title} detail"><slot /></div>
  </div>
</section>

<style>
  .workspace {
    box-sizing: border-box;
    width: 100%;
    max-width: 55em;
    margin: 0 auto;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding: 0.5rem 1rem 0.75rem;
    text-align: left;
    overflow: hidden;
  }
  header {
    flex-shrink: 0;
    border-bottom: 1px solid #bccbbb;
    padding: 0.65rem 0.1rem 0.8rem;
    margin-bottom: 0.8rem;
  }
  h1 {
    color: #163f2b;
    font-size: 1.3rem;
    margin: 0 0 0.25rem;
  }
  header p {
    color: #536052;
    font-size: 0.8rem;
    padding: 0;
    margin: 0;
  }
  .workspace-grid {
    display: grid;
    grid-template-columns: 11rem minmax(0, 1fr);
    gap: 1rem;
    flex: 1;
    min-height: 0;
  }
  nav {
    min-height: 0;
    overflow-y: auto;
    border: 1px solid #ccd5c9;
    border-radius: 0.4rem;
    background: #f3f6f0;
    align-self: start;
    max-height: 100%;
    padding: 0.35rem;
    box-sizing: border-box;
  }
  .section-list {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }
  button {
    text-align: left;
    border: 0;
    border-radius: 0.25rem;
    background: transparent;
    padding: 0.6rem 0.65rem;
    color: #234730;
    font: inherit;
    font-size: 0.8rem;
    cursor: pointer;
  }
  button:hover {
    background: #e2eadc;
  }
  button[aria-current] {
    color: white;
    background: #163f2b;
    box-shadow: inset 3px 0 #c4a35a;
    font-weight: 650;
  }
  .detail {
    min-height: 0;
    min-width: 0;
    overflow: auto;
    overscroll-behavior: contain;
    padding: 0.1rem 0.3rem 0.8rem 0.1rem;
  }
  button:focus-visible,
  select:focus-visible,
  .detail:focus-visible {
    outline: 2px solid #a37c24;
    outline-offset: 2px;
  }
  .mobile-select {
    display: none;
  }
  @media (max-width: 40em) {
    .workspace {
      padding-left: 0.65rem;
      padding-right: 0.65rem;
    }
    .workspace-grid {
      grid-template-columns: 1fr;
      grid-template-rows: auto minmax(0, 1fr);
      gap: 0.65rem;
    }
    .section-list {
      display: none;
    }
    nav {
      padding: 0.5rem 0.6rem;
      overflow: visible;
    }
    .mobile-select {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      color: #163f2b;
      font-size: 0.75rem;
      font-weight: 600;
    }
    select {
      flex: 1;
      min-width: 0;
      max-width: 100%;
      font: inherit;
      padding: 0.45rem;
      background: white;
      color: #163f2b;
      border: 1px solid #aebdaf;
      border-radius: 0.25rem;
    }
  }
</style>
