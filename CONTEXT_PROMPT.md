# ForeBalance — context

Private, browser-local cashflow forecast. The user types pipe-separated `.psv` lines; the app expands recurrence and projects a running balance. **Text is the source of truth.** Data never leaves the device.

**Live:** [forebalance.app](https://forebalance.app)  
**Spec:** [`docs/forebalance-spec.md`](./docs/forebalance-spec.md)  
**Review (historical):** [`docs/forebalance-review-and-plan.md`](./docs/forebalance-review-and-plan.md)

## Stack

SvelteKit 2 + Svelte 5 + TypeScript + Vitest + `adapter-static` → Cloudflare Pages (`pnpm ship`). Dev port: LocalSlip lease `forebalance` (46000). Package manager: **pnpm**. App `package.json` stays `private: true` / `0.2.0`. npm `forebalance@0.0.1` is a **name hold** only (`npm-hold/`, `pnpm hold:publish`).

## Hero flow

1. Entries: edit `.psv` (CodeMirror), optional Import / linked file / **Roll recurring starts**.
2. Forecast: table + summary + sparkline from the earliest `B` line forward (`monthsToForecast`).
3. Settings: months, thresholds, holiday shift, same-day `B` meaning.

## DSL (short)

`TYPE|WHEN|AMOUNT|DESCRIPTION` — `B` / `C` / `D`. Recur: `YYYY-MM-DD,R[m][f][c]`. `R<`/`R>` business days. `RML` / `YYYY-MM-L` last day of month. `!` or `#` disables a line. `|#N=…` / `|#N=pending` overrides one occurrence. Main account: `B-ID-main`. Debt extras on first use — see Help.

Same-day order: `B`, then `C`, then `D`. Default: same-day C/D are already in the `B` amount (`in balance`) unless pending.

Forecast **drops rows before the `B` line** but still **walks** every recurring occurrence from the text start. **Roll recurring starts** rewrites unbounded `,R` lines to one period before that `B` date. Counted series (`RW5`) are left alone.

## Decisions to keep

- No accounts, telemetry, or server-side user data.
- No FilePress. No Capacitor.
- MIT; not financial advice. Copy talks about projections, not real-account promises.
- Do not load WebLLM / Qwen until the user starts Labs.
- Do not advertise old product names or the legacy site URL in current docs.
- ForgeTrail phase docs: this file + the spec stand in for TODO/IDEAS. Do not invent billing/auth exit criteria.

## Next (not already shipped)

Non-color threshold marks, mobile Forecast, optional parser skip for un-rolled old starts. Reconciliation wizard is deferred.
