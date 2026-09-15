# ForeBalance — Review & Modernization Plan

**Status:** Historical review (locked 2026-09-03). Foundation, P0/P1 DSL, and public MIT are in the product as of 2026-09-15.  
**Current truth:** [`forebalance-spec.md`](./forebalance-spec.md) and `CONTEXT_PROMPT.md`.  
**Date:** 2026-09-03 (status note 2026-09-15)

---

## 1. Executive Summary

ForeBalance is a small, working cashflow forecaster (~1,500 lines of app code across 26 source files). The plaintext DSL → recurrence engine → forecast table pipeline is intact and **builds successfully today** on SvelteKit 2 / Svelte 4 / Vite 5.

The repo needs a foundation refresh (dependencies, hygiene, branding, tests, TypeScript) before product features from the spec. SvelteKit + `adapter-static` + Cloudflare Pages via **Wrangler** remains the right stack for a free, privacy-first, client-only web tool.

**Execution order:**

1. **Foundation** — cleanup, ForeBalance rename, Svelte 5, TypeScript, Vitest, tooling integration.
2. **Finish multi-account / debt** — code exists; expose it in UI and docs.
3. **Product features** — P0 summary block, persistence safety, then P1+ from product spec.
4. **Deploy** — Wrangler → `forebalance.app`.

Work can proceed in this repo; a **new git remote** will be provided later — structure the project so migration is a straight copy.

---

## 2. Locked Decisions

| Decision | Choice |
|---|---|
| **Multi-account / debt tracking** | **Keep and finish.** In-flight work; expose in UI, document DSL, add tests. |
| **Capacitor / Android** | **Remove.** Wipe `android/`, Capacitor deps, `capacitor.config.ts`, `sandbox.txt`. PWA for installable mobile. |
| **Svelte version** | **Svelte 5** — migrate as part of foundation, not a second pass later. |
| **TypeScript** | **Yes.** Move parser, util, stores, formatters to `$lib/` as `.ts`. |
| **Tests** | **Yes.** Vitest; parser coverage before new DSL syntax. |
| **Package manager** | **pnpm** — delete stale `package-lock.json`. |
| **File format** | **Keep `.psv`** (pipe-separated values). Download as `forebalance-*.psv`. Import any `.psv`. |
| **Deployment** | **Wrangler** → Cloudflare Pages. Static output from `adapter-static` (`build/`). |
| **Publish intent** | **Public free web tool** — not productized, no charging. Still worth solid a11y and mobile layout. |
| **Toolchain** | **ForgeTrail** (lifecycle + tracking), **LocalSlip** (dev port), **LocalHelm** (fleet enrollment). **Not FilePress** — this app is distinct; no FilePress plugin/site pipeline. |
| **New repo** | `https://github.com/Catalyst-Forge-LLC/forebalance.git` |
| **Forecast max** | **24 months** — slider cap stays at 24 for now. |
| **About page** | **Yes** — replace placeholder with a proper About (what ForeBalance is, privacy/local-only, how to use `.psv`, link to Help). |
| **Theme** | **Keep green `#009900`** — positive, money-aligned; no redesign in v1. |

---

## 3. Current State

| Surface | Current |
|---|---|
| **Live site** | [forebalance.app](https://forebalance.app) |
| **Target repo** | [github.com/Catalyst-Forge-LLC/forebalance](https://github.com/Catalyst-Forge-LLC/forebalance.git) |
| **Download filenames** | `forebalance-*.psv` |
| **Package name** | `forebalance` |
| **Dev server** | LocalSlip lease `forebalance` on port **46000** |

---

## 4. What Works Today

Verified during review:

- `pnpm run build` completes; `adapter-static` writes to `build/`.
- Tab UX: Welcome → Entries → Forecast → Settings → Help.
- Plaintext editor, drag-and-drop `.psv` import.
- Recurrence engine (D/W/M/Y intervals, counts, end dates).
- Forecast table with monthly grouping, running balance, threshold coloring.
- Settings sliders (3–24 months, three balance thresholds).
- localStorage persistence; manual download.
- Markdown Help/Welcome via `vite-plugin-string` + `marked`.

The parser (`src/scripts/parseEntries.js`, ~300 lines) is functional, complex, untested, and mixes parsing with forecast projection.

---

## 5. Codebase Inventory

```
src/
├── routes/           +layout, +page (tabs), about (placeholder)
├── components/       Entries, ForecastTable, Settings, Help, Welcome, tabs/*
└── scripts/          parseEntries.js ★, util.js, stores.js, fmt.js, defaults
static/
├── md/help.md, welcome.md
├── dayjs.min.js      # global script — migrate to npm import
├── bootstrap-reboot.min.css
└── manifest.json     # minimal PWA
```

**Gaps:** no tests, no CI, no Wrangler config, no ForgeTrail tracking, logic is JS not TS, Capacitor scaffold present but unused.

---

## 6. Multi-Account & Debt — Finish the Build

Code in `parseEntries.js` already implements more than the product spec documents. This is **intentional in-flight work**, not dead code to remove.

### 6.1 What exists today

- `B-{accountId}-MAIN` — main checking account; balance resets.
- Debt sub-accounts: starting balance, interest rate(s), rate change date, running balance, paid-off detection.
- Extra-payment routing (`extraMonthlyPayment`, $250 chunks to interest-bearing accounts).

### 6.2 What's missing

| Gap | Work item |
|---|---|
| UI | Forecast tab only shows `activeAccount` (-MAIN). Add account selector or per-account tables. |
| Docs | Help markdown doesn't describe debt/multi-account syntax. |
| DSL spec | Extend `forebalance-spec.md` §3 with account suffix fields, interest columns. |
| Tests | Golden fixtures for multi-account scenarios, interest accrual, pay-off, extra payments. |
| Product spec P2 | Reframe from "open question" to "finish implementation." |

### 6.3 Finish plan

1. Document the full grammar (including optional fields on `C`/`D` lines for account binding).
2. Write parser tests against the existing behavior before refactoring to TypeScript.
3. Add Forecast UI: account tabs or a combined + per-debt view.
4. Surface sub-account running balance and interest in the table (partially started in `ForecastTable.svelte`).
5. Then proceed with P0/P1 product features on a stable parser.

### 6.4 Known behavioral gaps (fix with tests)

| Issue | Code evidence |
|---|---|
| Same-day sort order | `sortEntries()` — date, then type (`B`, `C`, `D`), then entry order. `balanceIncludesSameDay` defaults on; same-day C/D are `inBalance` unless `|#N=pending` |
| Malformed lines | Silently dropped — should surface in editor |
| `B` mid-forecast | Resets balance; prior-entry semantics undocumented |
| Month-end recurrence | `dayjs.add(n, 'month')` drifts on 29/30/31 |

Define stable sort rules and document before adding business-day modifiers or disable-line prefix.

---

## 7. Capacitor — Confirmed Removal

Audit found scaffold-only Android project: empty `BridgeActivity`, unused filesystem/geolocation plugins, no iOS folder, zero Capacitor imports in `src/`, package/path mismatches.

**Remove:**

- `android/` directory
- `@capacitor/*` dependencies
- `capacitor.config.ts`
- `sandbox.txt`

**Keep:** PWA manifest; expand for installability. File System Access API (product spec P0) on desktop; download/import fallback elsewhere.

---

## 8. Toolchain Integration

ForeBalance adopts the Catalyst Forge local-dev stack. **FilePress is explicitly out of scope** — this is a standalone SvelteKit app, not a FilePress-mounted site.

### 8.1 ForgeTrail (methodology)

ForgeTrail provides the 7-phase lifecycle and session memory:

```
Plan → Build → Stabilize → Iterate → Refine → Align → Harden
```

**Bootstrap when starting foundation work:**

- Create `.forgetrail/workflow_tracking.json` (via ForgeTrail MCP `getInitialWorkflowTracking` or `getNewProjectKickoff`).
- Lock `docs/PHASE_1_BRIEF.md` before major code changes.
- Add Cursor rules: `forgetrail-phase-status.mdc`, lessons gate rules.
- Archetype: **product** (public free tool, no billing/payments exit criteria).
- Persistence model: **local-only** — no PocketBase, no auth, `adapter-static`, no deploy secrets beyond Cloudflare account.

Phase mapping for this project:

| Phase | ForeBalance work |
|---|---|
| 1 Plan | This doc + product spec + PHASE_1_BRIEF lock |
| 2 Build | Svelte 5 + TS spine, parser tests, rename, Wrangler skeleton |
| 3 Stabilize | Fix Sass deprecations, Svelte 5 migration edge cases, build/lint clean |
| 4 Iterate | P0/P1 product features, finish debt UI |
| 5 Refine | Parser split, component cleanup if files grow |
| 6 Align | ForeBalance branding, copy, manifest, forebalance.app |
| 7 Harden | a11y pass, mobile layout, deploy, redirect old domain |

### 8.2 LocalSlip (dev port)

Replace hardcoded `--port 5174` with a named lease:

```bash
localslip claim forebalance --port 46000
```

In `vite.config.ts`:

```ts
import { localslipListen } from 'localslip/port';

const listen = localslipListen('forebalance', 46000);

export default defineConfig({
  server: { host: listen.host, port: listen.port, strictPort: true },
  // ...
});
```

Add `localslip` as a devDependency (or document global install). Port survives reboots; visible on LocalSlip dashboard (`:54321`).

### 8.3 LocalHelm (fleet)

When the repo moves to its final location / new remote:

```bash
localhelm scan ..
localhelm enroll ../forebalance --apply   # path as appropriate
localhelm status forebalance
```

Add to workspace fleet config if ForeBalance lives under `z:/workspace/`. Use `localhelm status`, `localhelm deps`, `localhelm push` for fleet ops. **Do not** configure the FilePress plugin for this project.

### 8.4 Wrangler (production deploy)

Static SvelteKit output → Cloudflare Pages:

```
pnpm ship               # build/ then wrangler pages deploy
```

**Add to repo:**

- `wrangler.jsonc` — `pages_build_output_dir: "build"`, project name `forebalance`
- `package.json` scripts: `"ship": "pnpm build && wrangler pages deploy build --project-name=forebalance"`
- `.gitignore` — ensure `.wrangler/` excluded
- `docs/DEPLOYMENT.md` — domain setup, `forebalance.app` DNS

No FilePress build step. No server-side routes needed (pure static SPA).

---

## 9. SvelteKit Modernization Plan

### Phase 0 — Cleanup

- [ ] Rename all surfaces to ForeBalance (see §10).
- [ ] Fix copy typos (product spec §5 items 1–5).
- [ ] Delete backup files, `package-lock.json`, `sandbox.txt`, Capacitor/Android.
- [ ] Untrack `.svelte-kit/` from git.
- [ ] Rewrite `README.md`.
- [ ] Set `package.json` `"name": "forebalance"`.
- [ ] Bootstrap ForgeTrail (`.forgetrail/`, phase 1 brief).
- [ ] LocalSlip claim + Vite config.
- [ ] Add `wrangler.jsonc` skeleton.

### Phase 1 — Svelte 5 + dependencies

| Package | Target |
|---|---|
| Svelte | 5.x |
| SvelteKit | latest 2.x |
| Vite | version required by Kit |
| TypeScript | 5.x |
| ESLint | 9 flat config + `eslint-plugin-svelte` |
| Prettier | 3.x |
| Vitest | latest |
| marked | latest |
| dayjs | npm import (remove global script) |
| svelte-file-dropzone | 2.x or native file input |

Run `npx sv migrate svelte-5` as starting point. Migrate runes, `$props()`, event handler syntax.

### Phase 2 — TypeScript + tests

```
src/lib/
├── parser/
│   ├── parseEntries.ts
│   ├── recurrence.ts
│   ├── accounts.ts          # multi-account / debt logic
│   ├── types.ts
│   └── *.test.ts
├── stores/
│   └── settings.ts
└── formatters/
    └── fmt.ts
```

Target **80%+ parser coverage** before new DSL features. Golden fixtures from `defaultEntries.js` plus multi-account/debt scenarios.

### Phase 3 — Product features

From `forebalance-spec.md`, with parser tests and debt UI inserted:

| Priority | Feature |
|---|---|
| **Finish** | Multi-account / debt UI + docs |
| P0 | Forecast summary block |
| P0 | Persistence safety (FS Access API + import button) |
| P1 | Business-day shifting, month-end rules, disable-line prefix |
| P2 | Sparkline, editor QoL (CodeMirror 6 evaluation) |
| P3 | Nice-to-haves |

### Phase 4 — Deploy

- [ ] Wrangler deploy to Cloudflare Pages.
- [ ] `forebalance.app` DNS.
- [ ] PWA manifest polish (`display: standalone`, icons).
- [ ] `adapter-static` `strict: true` once routes are clean.
- [ ] About page: what ForeBalance is, privacy promise, `.psv` format, no accounts/tracking.

---

## 10. Rename Checklist

Done. Header, title, manifest, Help, README, package name, and `forebalance-*.psv` downloads all say ForeBalance. Import still accepts older `.psv` filenames.

---

## 11. Proposed Sequencing

```
Foundation (Week 1)
├── Phase 0 cleanup + ForeBalance rename
├── Remove Capacitor; ForgeTrail bootstrap
├── Svelte 5 migration
├── LocalSlip + wrangler.jsonc
├── TS migration starts (parser first)
└── Vitest + first parser tests

Correctness + Debt (Week 2)
├── Define & test sort/malformed/B/month-end behaviors
├── Finish multi-account / debt UI + Help docs
├── P0: forecast summary block
└── P0: persistence (FS Access API + import)

Product + Ship (Week 3+)
├── P1 features
├── PWA + mobile layout
├── Wrangler deploy → forebalance.app
└── Push to github.com/Catalyst-Forge-LLC/forebalance
```

---

## 12. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Svelte 5 migration breaks tabs | Medium | Small tree; migrate incrementally |
| Parser regressions during TS refactor | High | Tests first; golden fixtures |
| Debt UI complexity | Medium | Ship read-only debt view before edit flows |
| FS Access API browser gaps | Medium | Download/import fallback |
| **Repo migration mid-work** | Low | Remote is set; push to Catalyst Forge org repo when ready |

---

## 13. Reconciliation — What It Means (Deferred)

ForeBalance today is **forward-only**: you set a starting balance (`B` line), list expected credits and debits, and the tool projects running balance into the future. It does not track whether those predictions matched reality.

**Reconciliation** is the workflow for when **actual life diverges from the forecast**:

| Situation | Today (manual) | A dedicated reconciliation feature |
|---|---|---|
| Balance today is $847, forecast assumed $1,000 | Edit the `B` line and tweak entries by hand | Enter actual balance as of a date; tool re-anchors the forecast from that truth |
| Rent was $1,050, you modeled $1,000 | Change the amount on that line (or add a one-off adjustment) | Mark occurrence as actual vs planned; optional variance column |
| You skipped savings this month | Prefix line with `!` (planned) or delete it | "Skip this occurrence" without losing the recurring rule |
| A week passed; forecast is stale | Re-read bank app, update `B`, adjust forward entries | Guided "catch up" flow: actual balance → diff vs projected → suggest edits |

**Why it matters:** Without reconciliation, the tool answers *"if my plan is right, when do I get uncomfortable?"* Reconciliation would answer *"given what actually happened, when do I get uncomfortable **now**?"* That second question is what people need after the first of the month — but it adds real complexity (anchor dates, variance, maybe bank import, UX for "plan vs actual").

**Recommendation for v1:** **Defer.** Users can already re-anchor with a new `B` line and edit entries. Ship P0 (summary block, persistence) and finished debt UI first. Revisit reconciliation as a **P2+ feature** once the core forecast loop is solid — possibly as:

1. **Light:** "Set balance as of today" wizard that inserts/updates a `B` line and trims or flags stale future rows.
2. **Medium:** Plan vs actual columns for past dates (manual "actual amount" on matched lines).
3. **Heavy:** CSV import from bank, matching heuristics — likely out of scope for a local-only privacy tool unless fully client-side.

**Owner decision still needed:** Any reconciliation in v1, or explicitly post-v1?

---

## 14. Remaining Open Questions

| **Reconciliation:** Defer to post-v1 (locked). Manual `B`-line re-anchor is sufficient for v1. |

---

## 15. Doc Relationships

| Doc | Purpose |
|---|---|
| **`forebalance-spec.md`** | What to build — DSL, features, priorities |
| **`forebalance-review-and-plan.md`** (this doc) | How to build it — stack, tooling, sequencing, locked decisions |
| **`docs/PHASE_1_BRIEF.md`** | ForgeTrail Phase 1 lock (create at kickoff) |
| **`docs/DEPLOYMENT.md`** | Wrangler + domain (create in Phase 7) |

Product spec wins on *features*; this doc wins on *engineering* until explicitly updated.

---

## Appendix — Build Verification

```
Date:   2026-09-03
Command: pnpm run build
Result:  SUCCESS (Sass + svelte-file-dropzone warnings)
Output:  build/ via @sveltejs/adapter-static
```
