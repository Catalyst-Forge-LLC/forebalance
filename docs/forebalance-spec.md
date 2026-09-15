# ForeBalance — Product Spec

**Status:** Working prototype
**Domain:** forebalance.app
**Last updated:** 2026-09-03

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
| Entries | Free-text editor, one entry per line |
| Entries | `--- Label` lines act as section comments/groupings |
| Entries | Drag-and-drop / click-to-select file import |
| Forecast | Chronological ledger table grouped by calendar month |
| Forecast | Columns: Date, Description, Credit, Debit, running Balance |
| Forecast | Per-occurrence counter appended to descriptions, e.g. `Weekly Food (#3)` |
| Forecast | Click a row to change that date or amount; this occurrence persists as `|#5=2026-05-08:65`, or rewrite the whole series |
| Forecast | Per-month summary row: total credits, total debits, net |
| Forecast | Rows color-coded against balance thresholds |
| Settings | Months to forecast (slider) |
| Settings | Goal Balance Threshold (slider) |
| Settings | Uncomfortable Balance Threshold (slider) |
| Settings | Low Balance Threshold (slider) |
| Settings | Reset entries and settings |
| Settings | Download entries |
| Persistence | Browser local storage only; cleared with browser cache |
| Help | Full DSL reference |

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
| `2026-03-15,R3M` | Every third month (quarterly) from Mar 15 |
| `2026-01-01,RY` | Yearly on Jan 1 |
| `2026-02-01,R2W` | Every two weeks from Feb 1 |
| `2026-02-10,R2D` | Every other day from Feb 10 |
| `2026-02-01,RW5` | Weekly, five occurrences |
| `2026-02-05,R2M3` | Every other month, three occurrences |
| `2026-02-10,R2D,2026-04-10` | Every other day, through Apr 10 |

**AMOUNT** — positive number; sign is implied by TYPE.

**DESCRIPTION** — free text.

**Comment/section lines** — begin with `---`.

---

## 4. Priority Improvements

### P0 — Surface the number that matters

The entire reason the tool exists is to answer "when do I get close to zero," and today the user must visually scan for gold rows to find it.

Add a persistent summary block at the top of the Forecast tab:

- **Lowest projected balance** and the date it occurs (e.g. `$760 on 9/10/26`)
- **First date the balance crosses below the Uncomfortable threshold**
- **First date the balance crosses below the Low threshold**
- **First date it goes negative**, if it ever does — this should be visually loud
- Count of days spent below each threshold across the forecast window

Each of these should link/scroll to the relevant row.

### P0 — Persistence safety

Current behavior loses all data on cache clear, mitigated only by a manual Download button and an on-screen warning. Options, in order of preference:

1. **File System Access API** — user picks a `.txt`/`.fbl` file once; app writes back on change. Best fit for the plaintext philosophy. Chromium-only; needs fallback.
2. **Auto-download on change**, debounced, with a versioned filename.
3. **IndexedDB** instead of localStorage, plus a "last backed up N days ago" nag.

Keep the Download button regardless. Add an explicit **Import** button alongside the drag-drop zone.

### P1 — Business-day shifting

Real bills move when the due date lands on a weekend or holiday, and different payees move them in different directions. Without this, forecasts drift from reality by a few days each month.

Proposed syntax — a modifier appended to the WHEN field:

- `>` shift to next business day
- `<` shift to previous business day
- absent — no shift (current behavior, remains the default)

Example: `D|2026-09-01,R<|1000|Rent`

Holiday calendar: start with US federal holidays, hardcoded, with a settings toggle. Note in Help that bank holidays ≠ federal holidays in every case.

### P1 — Month-end recurrence

`2026-01-31,R` is currently ambiguous. Define and document the behavior explicitly, and support the common case:

- Add a **last-day-of-month** token, e.g. `2026-01-L,R` or a `RML` frequency variant.
- For a fixed day-of-month that doesn't exist in a given month (31st in February), **clamp to the last day of that month** rather than skipping. Document this.
- Add a test matrix covering 29/30/31 starts across leap and non-leap years.

### P1 — Disable a line without deleting it

Enables scenario testing ("what if I skip savings this month") without destroying the entry.

- Prefix `!` or `#` on any entry line to exclude it from the forecast.
- Disabled lines should render visibly greyed in the editor if the editor gains syntax awareness.
- Consider a Forecast-tab toggle list of all entries with checkboxes, writing back to the text.

### P2 — Balance sparkline / chart

A compact balance-over-time line chart above the table, with the three thresholds drawn as horizontal reference lines and the minimum point marked. Purpose is shape recognition at a glance, not analysis. Keep it small and non-interactive if that keeps it simple.

### P1 — Multi-account & debt support (finish in-flight work)

Parser support for multi-account and debt tracking already exists but is undocumented and not fully exposed in the UI. **Finish this before layering on new DSL syntax.**

- `B-{accountId}-MAIN` — main checking account; balance resets.
- Debt sub-accounts: optional interest rate(s), rate-change date, running balance, paid-off detection, extra-payment routing.
- `C`/`D` entries bind to accounts via suffix or field (document the full grammar in Help).
- UI: account selector or per-account forecast tables; show sub-account running balance and interest where applicable.
- Tests: golden fixtures for interest accrual, pay-off, and extra-payment scenarios.

### P2 — Editor quality-of-life

- Syntax highlighting for TYPE / WHEN / AMOUNT / DESCRIPTION and `---` sections.
- Inline validation: mark malformed lines in the editor rather than silently dropping them.
- Line numbers.
- The editor is a plain textarea today; a lightweight code editor (CodeMirror 6) would deliver all of the above, at a bundle-size cost. Evaluate against the "stays simple, stays local" principle before committing.

### P3 — Nice to have

- Amount arithmetic in the AMOUNT field (`1000+250`) for splitting or adjusting without a calculator.
- Percentage or inflation escalators on recurring entries (`R,+3%Y`) for rent increases.
- Print stylesheet for the Forecast tab.
- Export forecast (not entries) to CSV.
- Keyboard shortcut to jump between tabs.
- URL-encoded share/bookmark of a scenario — **only** if it can be done without any server round-trip; verify this doesn't undercut the privacy promise.

---

## 5. Known Issues

| # | Severity | Issue |
|---|---|---|
| 1 | Copy | Typo in default data: `Paycheck evey other week` → `every` |
| 2 | Copy | Typo on Welcome tab: `ths data will go away` → `this` |
| 3 | Docs | Help examples use `2021-02-1` and `2021-02-5`, inconsistent with the stated `YYYY-MM-DD` format. Either fix the examples or document that the parser accepts non-padded values. |
| 4 | Docs | Help examples are dated 2021; refresh to current-year dates so they don't read as stale |
| 5 | Copy | Welcome tab calls it both a "fun little tool" and an "amazing tool" — pick one register. Given the DSL, lean toward plain and confident: *ForeBalance projects your account balance forward from a plaintext list of credits and debits.* |
| 6 | Behavior | Undefined/undocumented: what happens to a malformed line? Silently skipped, or error surfaced? Should be surfaced. |
| 7 | Behavior | `B` resets the running balance. Entries dated before it are dropped. Same-day items on a `B` date are *in balance* by default (`balanceIncludesSameDay`). `|#N=pending` (Forecast: Not yet posted) still applies that occurrence. |
| 8 | Behavior | Same-day sort is stable: date, then type (`B`, `C`, `D`), then entry order. |
| 9 | Accessibility | Threshold row coloring is the only signal for low/uncomfortable balances. Add a non-color indicator (icon or bold) for color-blind users. |
| 10 | Accessibility | Slider-only settings with no numeric input; add typed entry for precise threshold values. |
| 11 | Responsive | Layout appears desktop-first; verify the forecast table and editor are usable on mobile |
| 12 | Naming | Done — product surfaces, title, and download names use ForeBalance. |

---

## 6. Suggested Sequencing

1. Rename to ForeBalance; fix copy issues #1–#5.
2. Define and document behaviors #6–#8; add tests.
3. Finish multi-account / debt UI and docs (P1).
4. P0: summary block, persistence safety.
5. P1: business-day shifting, month-end recurrence, disable-line.
6. Everything else.

---

## 7. Open Questions for the Owner

- Is the forecast window capped at 24 months by the slider? **Yes — 24 is the cap for now.**
- Should the tool ever reconcile against an actual bank balance? See **`forebalance-review-and-plan.md` §13** for a full explanation of plan vs actual workflows. **Deferred from v1 unless owner wants a light re-anchor wizard.**
- Is there an intent to publish this, or is it permanently a personal tool? The answer changes how much matters in §5 (accessibility, mobile, onboarding).
