# Agent handoff prompt

Paste this at the start of an implementation session.

---

You are implementing the next ForeBalance increment in https://github.com/Catalyst-Forge-LLC/forebalance.

Read this spec pack first, in order:

- `00-README.md`
- `01-principles-and-current-state.md`
- `02-implementation-order.md`
- then the slice you are on

Hard rules:

- PSV text is the source of truth. Cards and Raw edit the same model.
- Browser-only. No user accounts, no ledger uploads, no credentials. Pay URL is a bookmark.
- Do not break old lines: `TYPE|WHEN|AMOUNT|DESCRIPTION` and existing debt extras must still parse.
- Interest stays APR/12 monthly on payment dates unless a later spec says otherwise.
- Expanded-card edits go through the same last-20 full-text history as Raw.
- Deleting a category never deletes entries; they go to Unfiled.
- Do not use eval() on model output. MathJSON (or a tiny allowlisted walker) only.
- Known payoff / what-if chips use deterministic TS math, not the LLM.
- Update Help when you change user-visible grammar.
- Write parser tests before changing parseEntries.

Current code to start from:

- `src/lib/parser/parseEntries.ts`
- `src/lib/parser/types.ts`
- `src/lib/data/entrySets.ts`, `entryHistory.ts`
- `src/components/Entries.svelte`, `PsvEditor.svelte`, `ForecastTable.svelte`
- `src/lib/labs/`
- `static/md/help.md`
- `docs/forebalance-spec.md` (shipping truth; this pack is the increment)

Implement **one slice** from `02-implementation-order.md`. Do not boil the ocean. When the slice meets its “Done when” line, stop and summarize files changed plus leftover risks.

Open decisions live in `11-open-decisions.md`. If blocked, use the stated temporary rule and tag `TODO(spec)`.

---

End prompt.
