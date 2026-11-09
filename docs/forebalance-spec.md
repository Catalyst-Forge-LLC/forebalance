# ForeBalance — Product Spec

**Status:** Public MIT prototype at forebalance.app
**Domain:** forebalance.app
**Last updated:** 2026-11-09

---

## 1. What It Is

ForeBalance is a private, browser-local cashflow forecaster. The user writes one plaintext line per transaction using a compact DSL, and the tool projects a running account balance forward as far as they choose.

The plaintext entry format is the core of the product, not an implementation detail. It is what makes the tool fast to edit, diffable, portable, and durable. Any enhancement that pushes users toward a form-based UI at the expense of the text format is moving in the wrong direction.

### Design principles

1. **Text is the source of truth.** Every feature must be expressible in the entry format.
2. **Browser-local scenarios.** No accounts, cloud saves, or app-owned telemetry. Entry data stays local unless the user explicitly exports or shares it. Hosting may include the performance beacon described in Privacy, and optional Labs may download model assets. New shared links carry entries in the URL fragment, not the HTTP query.
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
| Entries | Visual tiles or Raw text; add, edit, clone, change category, disable/enable, or delete with confirmation |
| Entries | Bulk update active debits by category. A debt balance reset takes effect at the end of the local date without moving checking; scheduled payment changes apply after that date. Either field can be changed independently. |
| Entries | CodeMirror editor with syntax highlighting, line numbers, and inline warnings |
| Entries | `--- Label` lines act as section comments/groupings |
| Entries | Prefix `!` or `#` to disable a line without deleting it |
| Entries | Multiple named scenarios; toolbar menu for clone, delete, import, export, starters |
| Entries | Drop zone on demand; optional linked `.psv` via File System Access |
| Entries | Last 20 full-text edits per scenario (restore with confirm) |
| Entries | **Roll recurring starts** — confirm, then rewrite old `,R` dates to one period before the `B` line |
| Forecast | Chronological ledger grouped by calendar month; sparkline + at-a-glance summary |
| Forecast | Lowest balance, first goal reached, and uncomfortable / low / negative crossings; jump to the row |
| Forecast | Click a row to change that date or amount (`|#5=…`) or rewrite the series |
| Forecast | `|#N=pending` / “Not yet posted” still applies a same-day hit after `B` |
| Forecast | Account selector when more than one account is in the file |
| Forecast | Toolbar kebab: export / copy CSV, copy glance summary, export all accounts |
| Settings | Display currency (rescales threshold marks to a rounded household size, not live FX); months (3–24) and three thresholds; Dates and balances (holiday shift, same-day `B` meaning) |
| Settings | Reset (type RESET; optional export of every scenario first) |
| Persistence | localStorage per scenario; optional Chromium file link; Download stays. Scenario `.psv` export and all-sets JSON include the display currency. Import without a currency asks before applying one. |
| Labs | “What hits next?” reads dated transactions directly from the active forecast without loading a model. |
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

## 4. Delivered features and open work

The editor supports amount arithmetic, annual escalators, debt payment strategies, extra payments, and dated debt/payment updates. Categories (including Credit cards) support filtering and quick reassignment. Forecast supports non-color threshold markers, monthly scrolling, print and CSV export. Alt+1–6 switches tabs; scenario sharing uses a URL fragment. Old non-debt recurrences can skip ahead; rolling recurring starts remains available. Turning off a forecast row disables its source line; re-enable it in Entries.

**Scenario merging:** Entries → Scenario actions → Merge into original opens a selective preview for a fork. Forecast → Compare offers the same action for a fork and its immediate parent. New forks capture their starting text; conflicting edits and older forks without a starting copy require manual review. Merging changes only the original, with its previous text available in Entries history.

**Bank reconciliation is deferred.** A new checking balance entry already re-anchors the forecast. Matching projected transactions against a statement is a different feature; see [the reconciliation decision](forebalance-review-and-plan.md#13-reconciliation--what-it-means-deferred).

## 5. Verification and remaining device check

Checked on 2026-11-09 using disposable scenarios:

- **Local model:** Qwen3 1.7B in Chrome explained a $400 rent debit from $500 to $100 against a $500 uncomfortable threshold. It also drafted the requested one-time $42 debit dated November 15 without inserting it. These fixtures verify the workflows; they do not establish general model accuracy.
- **Linked file:** Windows Chrome opened an unmarked PSV through the native picker, accepted the currency and write prompts, and saved an edit verified on disk. The link was restored after a full browser restart. If Chrome revokes write access, relink to resume disk saves.
- **Narrow screen:** At 390 CSS pixels and 4× CPU throttling, a 120-recurring-entry fixture rendered 739 forecast table rows. The month list scrolled, page width stayed at 390 pixels, and a Raw edit persisted.

**Still open:** run the large recurring scenario on a physical slower phone. Check month scrolling, opening an entry, and reaching Save with the software keyboard visible. Desktop emulation does not establish real touch or device performance.
