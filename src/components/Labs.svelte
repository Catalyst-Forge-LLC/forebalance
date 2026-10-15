<script lang="ts">
  import SectionWorkspace from './SectionWorkspace.svelte';
  let section = 'setup';
  let resultLabel = '';
  const sections = [
    { id: 'setup', label: 'Model setup' },
    { id: 'forecast', label: 'Explore forecast' },
    { id: 'draft', label: 'Draft entries' },
    { id: 'question', label: 'Ask a question' },
  ];
  import { onDestroy, onMount } from 'svelte';
  import { buildForecastBrief, buildWhyTight, splitModelReply } from '#lib/labs/context.ts';
  import { localIsoDate } from '#lib/formatters/dates.ts';
  import {
    currencyPromptNote,
    describeMatches,
    parseRouterReply,
    refineRoutedIds,
    routerPrompt,
    routerRetryPrompt,
    specialistPrompt,
    typesById,
    type QueryType,
  } from '#lib/labs/catalog.ts';
  import { keepPsvLines } from '#lib/labs/draft.ts';
  import { chooseBackend, hasWebGpu, probeNano, type LabsBackend, type NanoStatus } from '#lib/labs/detect.ts';
  import { WEBLLM_MODEL_ID, createLabsSession, type LabsSession } from '#lib/labs/session.ts';
  import { entrySetsStore } from '#lib/data/entrySets.ts';
  import { createFormatter } from '#lib/formatters/fmt.ts';
  import { settingsStore } from '#lib/stores/settings.ts';
  import type { BalanceFlags, ParsedEntry } from '#lib/parser/types.ts';

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
  let routedIds = '';

  $: activeName = $entrySetsStore.sets.find((set) => set.id === $entrySetsStore.activeId)?.name ?? 'this scenario';
  $: bothEngines = (nanoStatus === 'available' || nanoStatus === 'downloadable' || nanoStatus === 'downloading') && webgpu;
  $: currencyCode = $settingsStore.currencyIsoCode;
  $: affordPlaceholder = `A ${createFormatter($settingsStore).curr(240)} tire on Friday / skip eating out this month`;
  $: draftPlaceholder = `Rent ${createFormatter($settingsStore).curr(1185)} on the 1st, gig pay around ${createFormatter($settingsStore).curr(500)} each Friday…`;

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
      section = 'forecast';
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    } finally {
      loading = false;
    }
  }

  function brief() {
    return buildForecastBrief(entries, balanceFlags, useMainBalance, activeName);
  }

  function catalogAsk(ask: string, types: QueryType[], extra = '') {
    return `${describeMatches(types)}\n\n${currencyPromptNote(currencyCode)}\n\nAsk: ${ask}\nToday: ${localIsoDate()}${extra ? `\n\n${extra}` : ''}`;
  }

  async function runRouted(ask: string, extra = '') {
    if (!session || !ask.trim()) return;
    error = '';
    resultLabel = sections.find((item) => item.id === section)?.label ?? 'Question';
    running = true;
    output = '';
    thinking = '';
    routedIds = '';
    progressText = 'Routing…';
    try {
      const routed = splitModelReply(await session.prompt(routerPrompt(currencyCode), `Ask: ${ask}`, { maxTokens: 24 }));
      let ids = refineRoutedIds(parseRouterReply(routed.answer), ask);
      if (!ids.length) {
        progressText = 'Routing again…';
        const retry = splitModelReply(await session.prompt(routerRetryPrompt(), `Ask: ${ask}`, { maxTokens: 24 }));
        ids = refineRoutedIds(parseRouterReply(retry.answer), ask);
      }
      const types = typesById(ids);
      routedIds = types.map((type) => type.id).join(', ') || 'none';
      progressText = types.length ? `Filling ${routedIds}…` : 'No type matched…';
      const reply = splitModelReply(await session.prompt(specialistPrompt(types, currencyCode), catalogAsk(ask, types, extra)));
      let answer = reply.answer;
      if (types.length && types.every((type) => type.kind === 'draft')) {
        const lines = keepPsvLines(answer);
        if (lines.length) answer = lines.join('\n');
      }
      output = answer;
      thinking = reply.thinking;
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    } finally {
      running = false;
    }
  }

  function explainForecast() {
    return runRouted('Why is this tight?', `${brief()}\n\nComputed:\n${buildWhyTight(entries, balanceFlags, useMainBalance, activeName)}`);
  }

  function upcomingHits() {
    return runRouted('What hits next?', brief());
  }

  function moneyDrains() {
    return runRouted('Where does the money go?', brief());
  }

  function affordCheck() {
    return runRouted(affordAsk, brief());
  }

  function draftEntries() {
    return runRouted(draftAsk);
  }

  function freePrompt() {
    return runRouted(freeAsk);
  }

  function copyOutput() {
    if (output) void navigator.clipboard.writeText(output);
  }
</script>

<SectionWorkspace
  title="Labs"
  description="An experimental helper on this device. Review its answers before using them."
  items={sections}
  bind:active={section}
>
  <article class="labs">
    <div class="session-bar">
      <strong>{session ? session.label + ' ready' : loading ? 'Loading model…' : 'Model not loaded'}</strong><span>Scenario: {activeName}</span>
    </div>
    {#if section === 'setup'}
      <header class="hero">
        <h2>On-device helper</h2>
        <p>
          Experimental and on this device. <strong>Load a model first</strong>, then ask. Prompts stay in the tab. Nothing is sent to ForeBalance.
        </p>
      </header>

      <details class="status" open={preferred === 'none'}>
        <summary>Browser compatibility</summary>
        <p>
          Chrome Nano:
          <strong>{nanoStatus}</strong>
          · WebGPU:
          <strong>{webgpu ? 'yes' : 'no'}</strong>
        </p>
        {#if preferred === 'none'}
          <p class="warn">No compatible local model is available in this browser. Try a browser with built-in AI or WebGPU support, then check again.</p>
        {/if}
        <button type="button" disabled={loading || running} on:click={refreshProbe}>Check compatibility again</button>
      </details>

      {#if preferred !== 'none'}
        <section class="engine">
          <h3>Choose and load a model</h3>
          {#if bothEngines}
            <fieldset>
              <legend>Engine</legend>
              <label>
                <input type="radio" bind:group={selected} value="nano" disabled={loading || running} />
                Gemini Nano — browser-managed model; a download may be needed
              </label>
              <label>
                <input type="radio" bind:group={selected} value="webllm" disabled={loading || running} />
                Qwen3 1.7B — about 1 GB from Hugging Face, then cached
              </label>
            </fieldset>
          {:else if preferred === 'nano'}
            <p>This Chrome can use <strong>Gemini Nano</strong>. Load it before you ask.</p>
          {:else}
            <p>
              This browser can run <strong>Qwen3 1.7B</strong> (~1&nbsp;GB from Hugging Face, then cached). Load it before you ask.
            </p>
          {/if}

          <button type="button" class="primary" disabled={!selected || loading || running} on:click={loadEngine}>
            {session ? `Reload ${session.label}` : selected === 'nano' ? 'Load Gemini Nano' : 'Load Qwen3 1.7B'}
          </button>
          {#if loading || session}
            <label class="progress">
              <span>{progressText || (session ? session.label : '')}</span>
              <progress max="100" value={progress}></progress>
            </label>
          {/if}
        </section>
      {/if}
    {/if}

    {#if section !== 'setup'}
      {#if !session}<div class="setup-prompt">
          <p>Load a local model before asking. Your text stays on this device; the model may need a download.</p>
          <button type="button" on:click={() => (section = 'setup')}>Go to model setup</button>
        </div>{/if}
      <section class="actions">
        <h3>{sections.find((item) => item.id === section)?.label}</h3>
        {#if !session}
          <p class="hint">Questions stay disabled until the model is loaded. First click is a download; later visits use the cache.</p>
        {/if}
        {#if section === 'forecast'}
          <p class="hint">Explore the current scenario. These answers are experimental, not financial advice.</p>
          <button type="button" disabled={!session || running || !forecastReady} on:click={explainForecast}> Why is this tight? </button>
          <button type="button" disabled={!session || running || !forecastReady} on:click={upcomingHits}> What hits next? </button>
          <button type="button" disabled={!session || running || !forecastReady} on:click={moneyDrains}> Where does the money go? </button>
          {#if !forecastReady}
            <p class="hint">Open a scenario with a forecast first.</p>
          {/if}

          <label>
            Can I afford this?
            <textarea bind:value={affordAsk} rows="2" placeholder={affordPlaceholder}></textarea>
          </label>
          <button type="button" disabled={!session || running || !forecastReady || !affordAsk.trim()} on:click={affordCheck}> Check </button>
        {/if}
        {#if section === 'draft'}
          <p class="hint">Describe your bills and paydays. Review the draft before copying it into Entries.</p>
          <label>
            Draft entries from a description
            <textarea bind:value={draftAsk} rows="3" placeholder={draftPlaceholder}></textarea>
          </label>
          <button type="button" disabled={!session || running || !draftAsk.trim()} on:click={draftEntries}> Draft entries </button>
        {/if}
        {#if section === 'question'}
          <label>
            A format question, or your own
            <textarea bind:value={freeAsk} rows="2" placeholder="What does R2W mean?"></textarea>
          </label>
          <button type="button" disabled={!session || running || !freeAsk.trim()} on:click={freePrompt}>Ask</button>
        {/if}
      </section>

      {#if running}
        <p class="hint" role="status">{progressText || 'Working…'}</p>
      {/if}
      {#if output}
        <section class="output">
          <div class="output-bar">
            <h3>Result · {resultLabel}</h3>
            <button type="button" on:click={copyOutput}>Copy</button>
          </div>
          {#if routedIds}
            <details>
              <summary>Technical details</summary>
              <p class="hint">Matched types: {routedIds}</p>
            </details>
          {/if}
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
      <p class="err" role="alert">{error}</p>
    {/if}
  </article>
</SectionWorkspace>

<style lang="scss">
  .session-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 1rem;
    justify-content: space-between;
    border: 1px solid #ccd5c9;
    border-radius: 0.35rem;
    background: #edf2e9;
    padding: 0.65rem;
    margin-bottom: 1rem;
    font-size: 0.8rem;
    color: #163f2b;
  }
  .setup-prompt {
    background: #fff8e6;
    border-left: 3px solid #a37c24;
    padding: 0.75rem;
    margin-bottom: 1rem;
  }
  .setup-prompt p {
    padding: 0;
    margin: 0 0 0.5rem;
    font-size: 0.85rem;
  }
  .labs {
    width: 100%;
    max-width: none;
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    text-align: left;
    color: #222;
  }

  .hero h2,
  .engine h3,
  .actions h3,
  .output h3 {
    margin: 0 0 0.6rem;
    font-size: 1.1rem;
    color: #163f2b;
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
    background: #163f2b;
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
