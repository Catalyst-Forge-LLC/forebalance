# ForeBalance — Product Spec

**Status:** Public MIT prototype at forebalance.app
**Domain:** forebalance.app
**Last updated:** 2026-09-15

---

## 1. What It Is

ForeBalance is a private, browser-local cashflow forecaster. The user writes one plaintext line per transaction using a compact DSL, and the tool projects a running account balance forward as far as they choose.

The plaintext entry format is the core of the product, not an implementation detail. It is what makes the tool fast to edit, diffable, portable, and durable. Any enhancement that pushes users toward a form-based UI at the expense of the text format is moving in the wrong direction.

### Design principles

1. **Text is the source of truth.** Every feature must be expressible in the entry format.
2. **Local only.** No network calls, no telemetry, no accounts, no ads. Data never leaves the device.
3. **Answer one question well:** *what will my balance be, and when does it get uncomfortable?*
4. **Degrade gracefully.** A malformed line should never blank the forecast.

### Naming and styling

- Product name: **ForeBalance** (internal capital B).
- Domain, filenames, identifiers: lowercase `forebalance`.
- Do **not** use all-caps `FOREBALANCE`.
- Tagline candidate: *Cashflow sanity, in plain text.*

---

## 2. Current Feature Set (as built)

| Area | Feature |
|---|---|
| Entries | CodeMirror editor with syntax highlighting, line numbers, and inline warnings |
| Entries | `--- Label` lines act as section comments/groupings |
| Entries | Prefix `!` or `#` to disable a line without deleting it |
| Entries | Multiple named scenarios; toolbar menu for clone, delete, import, export, starters |
| Entries | Drop zone on demand; optional linked `.psv` via File System Access |
| Entries | Last 20 full-text edits per scenario (restore with confirm) |
| Entries | **Roll recurring starts** — confirm, then rewrite old `,R` dates to one period before the `B` line |
| Forecast | Chronological ledger grouped by calendar month; sparkline + at-a-glance summary |
| Forecast | Lowest / uncomfortable / low / negative crossings; jump to the row |
| Forecast | Click a row to change that date or amount (`|#5=…`) or rewrite the series |
| Forecast | `|#N=pending` / “Not yet posted” still applies a same-day hit after `B` |
| Forecast | Account selector when more than one account is in the file |
| Forecast | Toolbar kebab: export / copy CSV, copy glance summary, export all accounts |
| Settings | Display currency (rescales threshold marks to a rounded household size, not live FX); months (3–24) and three thresholds; Dates and balances (holiday shift, same-day `B` meaning) |
| Settings | Reset (type RESET; optional export of every scenario first) |
| Persistence | localStorage per scenario; optional Chromium file link; Download stays. Scenario `.psv` export and all-sets JSON include the display currency. Import without a currency asks before applying one. |
| Labs | Local syntax answers; optional on-demand Chrome Nano / WebLLM (not loaded until asked) |
| Help / About | Help is a tab. About and Privacy open as a large modal from the site menu. That menu also has GitHub, Catalyst Forge, and a flyout to ForgeTrail, LocalSlip, and LocalHelm |
| Publish | App is `private: true` in git. npm `forebalance@0.0.1` is a name hold only. |

---

## 3. Entry Format Reference (current grammar)

```
TYPE|WHEN|AMOUNT|DESCRIPTION
```

**TYPE**

| Code | Meaning |
|---|---|
| `B` | Balance as of a date (resets the running balance) |
| `C` | Credit on a date |
| `D` | Debit on a date |

`B` entries may carry an account suffix, e.g. `B-CHCK5432`.

**WHEN**

Single entry: a date in `YYYY-MM-DD`.

Recurring entry: `YYYY-MM-DD,R[m][f][c]` or `YYYY-MM-DD,R[m][f],YYYY-MM-DD`

- `m` — interval multiple, integer ≥ 1, defaults to `1`, omittable
- `f` — interval frequency: `D` daily, `W` weekly, `M` monthly (default), `Y` yearly
- `c` — recurrence count, integer ≥ 1, defaults to unbounded (capped by forecast window)
- Trailing date — explicit end date

Examples:

| Entry | Meaning |
|---|---|
| `2026-04-01,R` | Monthly from Apr 1 |
| `2026-04-01,R3` | Monthly, three times (no letter: the number is the count) |
| `2026-03-15,R3M` | Every third month (quarterly) from Mar 15 |
| `2026-03-15,R3M3` | Every third month, three times |
| `2026-02-01,RW3` | Weekly, three times |
| `2026-02-01,R3W` | Every three weeks |
| `2026-01-01,RY` | Yearly on Jan 1 |
| `2026-02-01,R2W` | Every two weeks from Feb 1 |
| `2026-02-10,R2D` | Every other day from Feb 10 |
| `2026-02-01,RW5` | Weekly, five occurrences |
| `2026-02-05,R2M3` | Every other month, three occurrences |
| `2026-02-10,R2D,2026-04-10` | Every other day, through Apr 10 |

**AMOUNT** — positive number; sign is implied by TYPE.

**DESCRIPTION** — free text.

**Comment/section lines** — begin with `---`.

**Disable** — prefix `!` or `#` on the line (`!D|2026-04-16,R|500|Savings`). `#` at the start of a line is a disable; `|#5=` is an occurrence override.

**Business-day shift** — append `<` or `>` to the recur token (`R<`, `R>`). Settings can treat US federal holidays as non-business days.

**Last day of month** — `2026-01-L,RML` (or `RML`). A fixed day that does not exist (Jan 31 → February) **clamps** to the last day of that month.

**One occurrence** — `|#N=YYYY-MM-DD:AMT`, `|#N=AMT`, `|#N=YYYY-MM-DD`, or `|#N=pending`.

**Debt / extra fields** — `TYPE-ACCOUNT|WHEN|AMOUNT|DESCRIPTION|ACCOUNT|STARTING_BAL|APR` (see Help).

---

## 4. Remaining improvements

Shipped (do not rebuild): Forecast summary + sparkline, File System Access + Import, `R<`/`R>`, `RML` / clamp, `!`/`#` disable, multi-account selector + Help, CodeMirror + warnings, `|#N=pending`, Labs on demand, public MIT + npm name hold, **roll recurring starts**.

### P2 — Accessibility and mobile

- Threshold row coloring is still the loudest low-balance signal. Add a non-color mark (icon or weight) for color-blind users.
- Forecast table and editor should stay usable on a phone.

### P2 — Engine skip (optional)

Rolling the text is the product fix. The parser could also skip expanding occurrences before the period prior to `B` so un-rolled 2020 starts stay cheap. Do not change occurrence numbers in the UI unless the text start moved.

### P3 — Nice to have

- Amount arithmetic in the AMOUNT field (`1000+250`).
- Percentage or inflation escalators on recurring entries (`R,+3%Y`).
- Print stylesheet for Forecast; export the table to CSV.
- Keyboard shortcut to jump between tabs.
- Forecast-tab checkboxes that write `!` / `#` back into the text.
- URL-encoded share of a scenario — **only** if it stays client-side.
- Deeper debt fixtures (interest, pay-off, extra payments) if the model grows.

---

## 5. Known Issues

| # | Severity | Issue |
|---|---|---|
| 1–5 | Copy | **Done** — starter copy, Welcome register, and Help dates were refreshed. |
| 6 | Behavior | **Done** — malformed lines are skipped and listed as warnings under the editor. |
| 7 | Behavior | `B` resets the running balance. Entries dated before it are dropped. Same-day items on a `B` date are *in balance* by default (`balanceIncludesSameDay`). `|#N=pending` still applies that occurrence. |
| 8 | Behavior | Same-day sort is stable: date, then type (`B`, `C`, `D`), then entry order. |
| 9 | Accessibility | Threshold row coloring is still the loudest low-balance signal. Add a non-color mark. |
| 10 | Accessibility | **Done** — Settings thresholds have a number input next to the slider. |
| 11 | Responsive | Layout is still desktop-first; verify Forecast + editor on a phone. |
| 12 | Naming | **Done** — ForeBalance on product surfaces, title, and downloads. |
| 13 | Behavior | Unbounded `,R` lines walk every occurrence from the text start to the forecast end, then slice at `B`. **Roll recurring starts** rewrites the text to one period before `B`. |

---

## 6. Suggested Sequencing

1. **Done** — rename, copy, documented `B` / same-day / pending, tests.
2. **Done** — multi-account UI + Help, summary, file link, DSL P1, CodeMirror.
3. **Done** — public MIT, npm name hold, CI + Dependabot, repo card.
4. **This pass** — spec/tracking catch-up; roll recurring starts.
5. Next product: a11y non-color marks, mobile Forecast, optional engine skip for un-rolled old starts.

---

## 7. Open Questions for the Owner

- Is the forecast window capped at 24 months by the slider? **Yes — 24 is the cap for now.**
- Should the tool ever reconcile against an actual bank balance? See **`forebalance-review-and-plan.md` §13**. **Deferred from v1** (manual `B` re-anchor is enough).
- Public? **Yes** — MIT, `forebalance.app`, GitHub public. Accessibility and mobile still matter for visitors, not only the owner.
