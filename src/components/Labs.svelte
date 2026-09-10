<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import {
    AFFORD_SYSTEM,
    DRAFT_SYSTEM,
    DRAINS_SYSTEM,
    FREE_SYSTEM,
    UPCOMING_SYSTEM,
    buildForecastBrief,
    buildWhyTight,
    splitModelReply,
  } from '$lib/labs/context';
  import { FORMAT_CARD, answerSyntaxQuestion } from '$lib/labs/syntax';
  import {
    chooseBackend,
    hasWebGpu,
    probeNano,
    type LabsBackend,
    type NanoStatus,
  } from '$lib/labs/detect';
  import { WEBLLM_MODEL_ID, createLabsSession, type LabsSession } from '$lib/labs/session';
  import { entrySetsStore } from '$lib/data/entrySets';
  import type { BalanceFlags, ParsedEntry } from '$lib/parser/types';

  export let entries: ParsedEntry[] = [];
  export let balanceFlags: BalanceFlags;
  export let useMainBalance = true;
  export let forecastReady = false;

  let nanoStatus: NanoStatus = 'missing';
  let webgpu = false;
  let preferred: LabsBackend = 'none';
  let selected: Exclude<LabsBackend, 'none'> | '' = '';
  let session: LabsSession | null = null;
  let loading = false;
  let running = false;
  let progress = 0;
  let progressText = '';
  let output = '';
  let thinking = '';
  let error = '';
  let draftAsk = '';
  let affordAsk = '';
  let freeAsk = '';

  $: activeName =
    $entrySetsStore.sets.find((set) => set.id === $entrySetsStore.activeId)?.name ?? 'this scenario';
  $: bothEngines =
    (nanoStatus === 'available' || nanoStatus === 'downloadable' || nanoStatus === 'downloading') &&
    webgpu;

  onMount(() => {
    void refreshProbe();
  });

  onDestroy(() => {
    session?.destroy();
  });

  async function refreshProbe() {
    webgpu = hasWebGpu();
    nanoStatus = await probeNano();
    preferred = chooseBackend(nanoStatus, webgpu);
    if (!selected && preferred !== 'none') {
      selected = preferred;
    }
  }

  async function loadEngine() {
    if (!selected) return;
    error = '';
    loading = true;
    progress = 0;
    progressText = selected === 'nano' ? 'Starting Nano…' : `Downloading ${WEBLLM_MODEL_ID}…`;
    session?.destroy();
    session = null;
    try {
      session = await createLabsSession(selected, (percent, text) => {
        progress = percent;
        progressText = text;
      });
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    } finally {
      loading = false;
    }
  }

  async function run(system: string, user: string, think = false) {
    if (!session || !user.trim()) return;
    error = '';
    running = true;
    output = '';
    thinking = '';
    try {
      const reply = splitModelReply(await session.prompt(system, user.trim(), { think }));
      output = reply.answer;
      thinking = reply.thinking;
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    } finally {
      running = false;
    }
  }

  function brief() {
    return buildForecastBrief(entries, balanceFlags, useMainBalance, activeName);
  }

  function explainForecast() {
    error = '';
    thinking = '';
    output = buildWhyTight(entries, balanceFlags, useMainBalance, activeName);
  }

  function upcomingHits() {
    return run(UPCOMING_SYSTEM, `What hits next?\n\n${brief()}`);
  }

  function moneyDrains() {
    return run(DRAINS_SYSTEM, `Where does the money go?\n\n${brief()}`);
  }

  function affordCheck() {
    return run(AFFORD_SYSTEM, `${affordAsk}\n\n${brief()}`);
  }

  function draftEntries() {
    return run(DRAFT_SYSTEM, `${FORMAT_CARD}\n\nWrite lines for:\n${draftAsk}`, true);
  }

  function freePrompt() {
    const canned = answerSyntaxQuestion(freeAsk);
    if (canned) {
      error = '';
      thinking = '';
      output = canned;
      return;
    }
    if (!session) {
      error = '';
      thinking = '';
      output = 'Not a known format token. See the Help tab, or load a model for a custom ask.';
      return;
    }
    return run(FREE_SYSTEM, `${FORMAT_CARD}\n\nQuestion: ${freeAsk}`);
  }

  function copyOutput() {
    if (output) void navigator.clipboard.writeText(output);
  }
</script>

<article class="labs">
  <header class="hero">
    <p class="badge">Labs</p>
    <h2>On-device helper</h2>
    <p>
      Experimental. Chrome can use Gemini Nano already on this computer. Other browsers with WebGPU
      can download Qwen3 1.7B (~1&nbsp;GB) into this origin. Prompts stay in the tab. Nothing is
      sent to ForeBalance.
    </p>
  </header>

  <section class="status" aria-live="polite">
    <p>
      Chrome Nano:
      <strong>{nanoStatus}</strong>
      · WebGPU:
      <strong>{webgpu ? 'yes' : 'no'}</strong>
    </p>
    {#if preferred === 'none'}
      <p class="warn">
        Need Google Chrome 148+ (Nano) or a desktop browser with WebGPU (Brave and Edge usually).
      </p>
    {/if}
  </section>

  {#if preferred !== 'none'}
    <section class="engine">
      {#if bothEngines}
        <fieldset>
          <legend>Engine</legend>
          <label>
            <input type="radio" bind:group={selected} value="nano" disabled={loading || running} />
            Gemini Nano — already in Chrome, smaller, starts faster
          </label>
          <label>
            <input type="radio" bind:group={selected} value="webllm" disabled={loading || running} />
            Qwen3 1.7B — larger download, works in Brave
          </label>
        </fieldset>
      {:else if preferred === 'nano'}
        <p>This Chrome can use <strong>Gemini Nano</strong>.</p>
      {:else}
        <p>This browser can download <strong>Qwen3 1.7B</strong> via WebLLM.</p>
      {/if}

      <button type="button" class="primary" disabled={!selected || loading || running} on:click={loadEngine}>
        {session ? `Reload ${session.label}` : 'Load model'}
      </button>
      {#if loading || session}
        <label class="progress">
          <span>{progressText || (session ? session.label : '')}</span>
          <progress max="100" value={progress}></progress>
        </label>
      {/if}
    </section>
  {/if}

  {#if preferred !== 'none'}
    <section class="actions">
      <h3>Ask the forecast</h3>
      <p class="hint">
        Why is this tight? and format tokens (R2W, RML, !) read the table and Help. Afford and
        draft still need a loaded model.
      </p>
      <button type="button" disabled={running || !forecastReady} on:click={explainForecast}>
        Why is this tight?
      </button>
      <button type="button" disabled={!session || running || !forecastReady} on:click={upcomingHits}>
        What hits next?
      </button>
      <button type="button" disabled={!session || running || !forecastReady} on:click={moneyDrains}>
        Where does the money go?
      </button>
      {#if !forecastReady}
        <p class="hint">Open a scenario with a forecast first.</p>
      {/if}

      <label>
        Can I afford this?
        <textarea
          bind:value={affordAsk}
          rows="2"
          placeholder="A $240 tire on Friday / skip eating out this month"
        ></textarea>
      </label>
      <button
        type="button"
        disabled={!session || running || !forecastReady || !affordAsk.trim()}
        on:click={affordCheck}
      >
        Check
      </button>

      <label>
        Draft .psv from a description
        <textarea
          bind:value={draftAsk}
          rows="3"
          placeholder="Rent $1,185 on the 1st, gig pay around $500 each Friday…"
        ></textarea>
      </label>
      <button type="button" disabled={!session || running || !draftAsk.trim()} on:click={draftEntries}>
        Draft lines
      </button>

      <label>
        Syntax or a custom ask
        <textarea bind:value={freeAsk} rows="2" placeholder="What does R2W mean?"></textarea>
      </label>
      <button type="button" disabled={running || !freeAsk.trim()} on:click={freePrompt}>Ask</button>
    </section>

    {#if running}
      <p class="hint">Working…</p>
    {/if}
    {#if output}
      <section class="output">
        <div class="output-bar">
          <h3>Result</h3>
          <button type="button" on:click={copyOutput}>Copy</button>
        </div>
        <pre>{output}</pre>
        {#if thinking}
          <details>
            <summary>How it reasoned</summary>
            <pre class="think">{thinking}</pre>
          </details>
        {/if}
      </section>
    {/if}
  {/if}

  {#if error}
    <p class="err">{error}</p>
  {/if}
</article>

<style lang="scss">
  .labs {
    max-width: 40em;
    margin: 0 auto;
    padding: 0.75rem 1rem 2rem;
    text-align: left;
    color: #222;
  }

  .hero h2,
  .actions h3,
  .output h3 {
    margin: 0 0 0.4rem;
    color: #006600;
  }

  .badge {
    display: inline-block;
    margin: 0 0 0.35rem;
    padding: 0.1rem 0.45rem;
    background: #fff3cd;
    border: 1px solid #cc8800;
    border-radius: 0.3rem;
    color: #664400;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .hero p,
  .status p,
  .engine p {
    margin: 0 0 0.75rem;
    line-height: 1.45;
  }

  .warn,
  .err {
    color: #aa0000;
  }

  .hint {
    margin: 0.35rem 0 0.75rem;
    font-size: 0.85rem;
    color: #555;
  }

  fieldset {
    margin: 0 0 0.75rem;
    padding: 0.5rem 0.75rem;
    border: 1px solid #cce8cc;
    border-radius: 0.5rem;
  }

  fieldset label {
    display: block;
    margin: 0.35rem 0;
  }

  .engine,
  .actions,
  .output {
    margin-bottom: 1.25rem;
  }

  button {
    background: #e8f5e8;
    border: 1px solid #009900;
    border-radius: 0.4rem;
    color: #004400;
    cursor: pointer;
    font: inherit;
    margin: 0 0.4rem 0.6rem 0;
    padding: 0.35rem 0.75rem;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .primary {
    background: #009900;
    color: #fff;
    font-weight: 700;
  }

  label {
    display: block;
    margin: 0.75rem 0 0.35rem;
    font-weight: 700;
    color: #004400;
  }

  textarea {
    display: block;
    width: 100%;
    margin-top: 0.3rem;
    padding: 0.4rem 0.5rem;
    border: 1px solid #009900;
    border-radius: 0.35rem;
    font: inherit;
    box-sizing: border-box;
  }

  .progress {
    display: block;
    margin-top: 0.75rem;
    font-weight: normal;
    font-size: 0.85rem;
  }

  progress {
    display: block;
    width: 100%;
    margin-top: 0.25rem;
  }

  .output-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  pre {
    margin: 0;
    padding: 0.65rem 0.75rem;
    overflow-x: auto;
    background: #143314;
    color: #e8ffe8;
    border-radius: 0.4rem;
    white-space: pre-wrap;
    font-size: 0.85rem;
  }

  details {
    margin-top: 0.65rem;
    color: #555;
    font-size: 0.85rem;
  }

  details summary {
    cursor: pointer;
  }

  pre.think {
    margin-top: 0.4rem;
    background: #222;
    color: #ccc;
  }
</style>
