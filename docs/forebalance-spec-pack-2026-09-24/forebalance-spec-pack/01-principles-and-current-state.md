# Principles and current state

**Last updated:** 2026-09-24  
**Current product spec in repo:** `docs/forebalance-spec.md` (dated 2026-09-15)  
**AppFacts version label:** ForeBalance v0.2.0  
**Public repo as of 2026-09-17:** https://github.com/Catalyst-Forge-LLC/forebalance

## Design principles (do not break)

From the shipping product spec:

1. **Text is the source of truth.** Every feature must be expressible in the entry format.
2. **Local only.** No network calls for user financial data, no telemetry, no user accounts, no ads. Data never leaves the device except when the user explicitly exports or when Labs loads a local model the user asked for.
3. **Answer one question well:** what will my balance be, and when does it get uncomfortable?
4. **Degrade gracefully.** A malformed line must never blank the forecast.

Additional locks from this increment:

5. **Cards are a view, not a second database.** Raw PSV and Cards read/write the same parsed model and serialize back to PSV.
6. **No credentials.** A pay URL is a bookmark. Never store username, password, or session tokens.
7. **Nothing user-created disappears.** Disabled lines stay in the file. Deleted categories move entries to Unfiled. History can restore prior full text.

The existing spec already says: any enhancement that pushes users toward a form-based UI *at the expense of* the text format is moving in the wrong direction. Dual-mode is allowed because text remains canonical.

## Stack (shipping)

- SvelteKit 2 + Svelte 5 + TypeScript
- CodeMirror editor
- localStorage + optional File System Access
- adapter-static → Cloudflare Pages (`forebalance.app`)
- Vitest
- Labs: Chrome Nano / WebLLM on demand, not preloaded

## What already exists (do not rebuild)

### Entry grammar (shipping)

```
TYPE|WHEN|AMOUNT|DESCRIPTION
```

Types: `B` balance reset, `C` credit, `D` debit. `G` appears in parser types; treat as existing internal type — do not invent new meaning without checking `src/lib/parser/types.ts`.

Recurrence: `YYYY-MM-DD,R[m][f][c]` or with end date. Frequencies D/W/M/Y. Business-day `<` `>`. Last-day `L` / `RML`.

Disable: prefix `!` or `#` on the line.

Occurrence override: `|#N=YYYY-MM-DD:AMT`, `|#N=AMT`, `|#N=YYYY-MM-DD`, `|#N=pending`.

Section/group comments: lines beginning `---`.

### Multi-account and debt (shipping, finish rather than replace)

Help documents:

```
TYPE-ACCOUNT|WHEN|AMOUNT|DESCRIPTION|ACCOUNT|STARTING_BAL|APR
```

Examples:

```
D-CO|2026-04-15,R|150|Capital One-4321|CO|2800|19.99
D|2026-04-15,R|150|Capital One|4321|2800|19.99
```

Parser account object already has:

- `id`, `isMain`, `startingBal`, `runningBal`
- `name`, `lastFour`
- `interestRate`, `interestRate2`, `interestRate2Date`
- `extraPayment`

Interest (shipping behavior): monthly, APR/12 × remaining balance, applied on the payment date **before** the payment is subtracted. Not daily compounding. Paid-off detection when remaining balance ≤ payment and > 1.

Forecast table already has a debt summary row (remaining + interest this month) when viewing main account.

Account selector already appears when more than one account is in the file.

### Persistence (shipping)

- localStorage per scenario
- Last **20** full-text edits per scenario, restore with confirm
- Optional Chromium file link
- Scenario `.psv` export; all-sets JSON includes display currency

### Scenarios (shipping, to be reframed)

Multiple named scenarios already exist: switch, rename, clone, delete, import, export, starters. This pack reframes them as what-if forks and adds comparison. Do not throw away the existing scenario store.

### Labs (shipping, to be extended)

On-demand local models. Not loaded until asked. This pack adds per-card chips and a MathJSON evaluation path.

## Code map (as of 2026-09-17 tree)

Start here before inventing files:

- `src/lib/parser/parseEntries.ts` — parse + projection
- `src/lib/parser/types.ts` — `ParsedEntry`, `Account`, `OccurrenceOverride`
- `src/lib/parser/occurrenceEdit.ts`
- `src/lib/data/entrySets.ts`, `entryHistory.ts`, `entriesPersistence.ts`
- `src/lib/persistence/psvPersistence.ts`
- `src/components/Entries.svelte`, `PsvEditor.svelte`, `ForecastTable.svelte`
- `src/lib/labs/` — session, syntax, models, WebLLM
- `static/md/help.md` — user-facing DSL help

## Tone for agents

- Prefer extending the parser and serializer over adding a parallel schema.
- Write parser tests before changing debt math.
- Keep Help and the spec grammar in sync with the parser.
- Currency, thresholds, holiday shift, same-day B semantics stay as they are unless a spec file here says otherwise.
