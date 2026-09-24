<script lang="ts">
  import { fmt } from '$lib/formatters/fmt';
  import {
    answerCardQuestion,
    chipsForLine,
    type CardAnswer,
  } from '$lib/labs/cardAsk';
  import type { SourceLine } from '$lib/parser/sourceLines';
  import type { Settings } from '$lib/parser/types';

  export let raw = '';
  export let line: SourceLine;
  export let settings: Settings;

  let prompt = '';
  let answer: CardAnswer | null = null;
  let askedFor = -1;

  $: chips = chipsForLine(line);
  $: if (line.index !== askedFor) {
    askedFor = line.index;
    prompt = '';
    answer = null;
  }

  function ask(text = prompt) {
    prompt = text;
    answer = answerCardQuestion(raw, line, settings, text);
  }

  function headline(value: CardAnswer): string {
    if (value.headline === null) return '';
    if (value.unit === 'currency') return fmt.curr(value.headline);
    if (value.unit === 'months') {
      const months = value.headline;
      return `${months} ${months === 1 ? 'month' : 'months'}`;
    }
    return String(Math.round(value.headline * 100) / 100);
  }
</script>

<fieldset class="group ask">
  <p class="group-title">Ask</p>
  <div class="ask-chips">
    {#each chips as chip}
      <button type="button" on:click={() => ask(chip.label)}>{chip.label}</button>
    {/each}
  </div>
  <form
    on:submit|preventDefault={() => ask()}
  >
    <label>
      Question
      <input bind:value={prompt} placeholder="Ask about this entry" />
    </label>
    <button type="submit">Ask</button>
  </form>
  {#if answer}
    <div class="ask-answer">
      {#if answer.headline !== null}
        <p class="ask-headline">{headline(answer)}</p>
      {/if}
      <p>{answer.prose}</p>
      {#if answer.equation}
        <p class="ask-equation">{answer.equation}</p>
      {/if}
    </div>
  {/if}
</fieldset>

<style lang="scss">
  @use '../scss/colors' as *;

  .ask-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;

    button {
      text-align: left;
      max-width: 100%;
    }
  }

  form {
    display: flex;
    gap: 0.45rem;
    align-items: end;

    label { flex: 1; }
    input { width: 100%; box-sizing: border-box; }
  }

  .ask-headline {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 700;
  }

  .ask-answer p { margin: 0.15rem 0; }

  .ask-equation {
    color: $clr-muted;
    font-size: 0.82rem;
  }
</style>
