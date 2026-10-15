<script lang="ts">
  import { everyUnit, type WhenForm, type RepeatKind } from '#lib/parser/whenForm.ts';
  export let whenForm: WhenForm;
  export let seriesIsEarly = false;
  export let onWhenChange: () => void;
  function pickRepeat(next: RepeatKind) {
    if (whenForm.repeat === next) return;
    whenForm.repeat = next;
    onWhenChange();
  }
</script>

<fieldset class="group">
  {#if seriesIsEarly}
    <p class="hint-line">This series starts before the balance date. Scenario actions → Roll recurring starts moves it to just before that date.</p>
  {/if}
  <div>
    <span class="field-label" id="entry-repeat-label">Repeats</span>
    <div class="choice" role="radiogroup" aria-labelledby="entry-repeat-label">
      {#each [['once', 'Once'], ['D', 'Daily'], ['W', 'Weekly'], ['M', 'Monthly'], ['Y', 'Yearly']] as [id, label] (id)}
        <button
          type="button"
          role="radio"
          aria-checked={whenForm.repeat === id}
          class:selected={whenForm.repeat === id}
          on:click={() => pickRepeat(id as RepeatKind)}>{label}</button
        >
      {/each}
    </div>
  </div>
  {#if whenForm.repeat !== 'once'}
    <div class="when-row">
      <label
        >Every
        <span class="every">
          <input type="number" min="1" bind:value={whenForm.every} on:change={onWhenChange} />
          {everyUnit(whenForm)}
        </span>
      </label>
    </div>
  {/if}
  {#if whenForm.repeat === 'M'}
    <label class="check">
      <input type="checkbox" bind:checked={whenForm.lastDay} on:change={onWhenChange} />
      Last day of the month
    </label>
  {/if}
  {#if whenForm.repeat !== 'once'}
    <div class="when-row">
      <label
        >Times
        <input type="number" min="1" placeholder="No limit" bind:value={whenForm.times} on:change={onWhenChange} />
      </label>
      <label
        >End
        <input type="date" bind:value={whenForm.end} on:change={onWhenChange} />
      </label>
      <label
        >Raise % / year
        <input
          type="number"
          min="0"
          step="0.1"
          placeholder="0"
          bind:value={whenForm.raise}
          on:change={() => {
            whenForm.raiseEvery = 'Y';
            onWhenChange();
          }}
        />
      </label>
      <label
        >Weekend
        <select bind:value={whenForm.shift} on:change={onWhenChange}>
          <option value="">Keep date</option>
          <option value="<">Previous weekday</option>
          <option value=">">Next weekday</option>
        </select>
      </label>
    </div>
  {/if}
</fieldset>

<style lang="scss">
  @use '../scss/colors' as *;
  .group {
    margin: 0;
    padding: 0.45rem 0.65rem 0.55rem;
    box-shadow: none;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .field-label {
    display: block;
    margin-bottom: 0.2rem;
    font-size: 0.85rem;
  }
  .choice {
    display: flex;
    flex-wrap: nowrap;
    gap: 0;
  }
  .choice button {
    flex: 1 1 0;
    min-width: 0;
    margin: 0;
    padding: 0.3rem 0.35rem;
    border-radius: 0;
    font-size: 0.82rem;
    position: relative;
    & + button {
      margin-left: -1px;
    }
    &:first-child {
      border-radius: 0.35rem 0 0 0.35rem;
    }
    &:last-child {
      border-radius: 0 0.35rem 0.35rem 0;
    }
  }
  .choice button.selected {
    z-index: 1;
    background: $clr-accent-soft;
    font-weight: 700;
  }
  .when-row {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.45rem 0.55rem;
    align-items: end;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    font-size: 0.85rem;
  }
  input,
  select {
    font: inherit;
    padding: 0.35rem 0.45rem;
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }
  .every {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }
  .every input {
    width: 3.4rem;
  }
  label.check {
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    gap: 0.4rem;
  }
  label.check input {
    width: auto;
    padding: 0;
  }
  .hint-line {
    font-size: 0.85rem;
  }
  @media (max-width: 640px) {
    .when-row {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
