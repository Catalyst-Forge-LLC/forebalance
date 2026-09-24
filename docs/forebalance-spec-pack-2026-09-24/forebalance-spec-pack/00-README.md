# ForeBalance Spec Pack — Dual-Mode Editor, Debts, Scenarios, Categories, Labs

**Product:** ForeBalance  
**Repo:** https://github.com/Catalyst-Forge-LLC/forebalance  
**Live:** https://forebalance.app  
**Pack date:** 2026-09-24  
**Audience:** coding agents implementing the next ForeBalance increment  
**Status:** Draft, conversation-locked 2026-09-24. Not yet merged into `docs/forebalance-spec.md`.

This pack is the implementation brief for features discussed and locked with the product owner. It does **not** replace `docs/forebalance-spec.md` in the repo. That file remains current-product truth. This pack is the *next increment*.

## How to use this pack

1. Read `01-principles-and-current-state.md` first. Do not violate those constraints.
2. Read `02-implementation-order.md` before writing code.
3. Implement one slice at a time. Each feature spec has acceptance criteria.
4. PSV text remains the source of truth. Every new field must round-trip through parse → model → serialize.
5. Do not invent credentials, cloud sync, or form-only data that cannot live in `.psv`.

## Files

| File | What it is |
|---|---|
| `00-README.md` | This index |
| `01-principles-and-current-state.md` | Locked product principles + what already ships |
| `02-implementation-order.md` | Suggested build order and dependencies |
| `03-psv-grammar-delta.md` | Exact PSV extensions (debt strategy, pay URL, notes, categories) |
| `04-dual-mode-editor.md` | Raw vs Cards, command bar, expand/kebab, history |
| `05-debt-accounts.md` | Credit cards, loans, strategies, payoff, what-if, pay URL |
| `06-scenarios.md` | What-if forks and comparison |
| `07-categories.md` | User-owned categories + Unfiled |
| `08-labs-mathjson.md` | Per-card Labs chips, MathJSON contract, safe eval |
| `09-data-model.md` | Types, persistence, import/export |
| `10-acceptance-and-tests.md` | Golden cases, agent test plan |
| `11-open-decisions.md` | Unresolved choices — do not invent past these |
| `12-agent-handoff.md` | Short prompt you can paste into an agent session |

## Locked product decisions (one page)

- Text is the source of truth. Cards are another editor over the same model.
- Browser-only. No accounts, no telemetry, no server-side personal data.
- No credentials. Pay URL is a URL only.
- Expanded-card edits are normal edits. They use the existing last-20 history.
- Click/tap card body to expand. Auto-save on close.
- Delete category never deletes entries. They go to **Unfiled**.
- Scenarios are named PSV copies used as what-if forks.
- Local models must emit MathJSON (or equivalent structured formula). JS evaluates the math.
- Interest in the current engine is APR/12 × remaining balance on payment dates, not daily compounding. Keep that unless the product spec is explicitly changed.

## Out of scope for this increment

- Cloud backup or multi-device sync
- Bank login / Plaid / OFX live connections (CSV/OFX *import mapping* may be a later slice)
- Credential vault
- Shareable hosted links that upload data
- Merging scenario forks
- Ranking “best” scenario
- Daily compounding or lender-accurate amortization (document the approximation; do not pretend otherwise)
