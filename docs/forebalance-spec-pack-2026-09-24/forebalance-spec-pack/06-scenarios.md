# What-if scenarios

## Purpose

The product already has named scenarios (demo vs personal, clone, import, export). Reframe them as **what-if forks** a user can compare.

## Model

A scenario record:

```
{
  id: string
  name: string
  description?: string
  parentId?: string | null
  createdAt: string
  text: string          // full PSV
  currency?: string     // already travels with exports
}
```

- Fork copies `text` and sets `parentId` to the source id.
- Edits to a fork never write the parent.
- Lineage is one parent pointer. No merge. No tree widget in v1.

## UI

Scenario switcher (already on Entries and Forecast):

- Rename, delete, import, export, starters — keep
- Relabel **Clone** to **Fork what-if…**
- Fork dialog: name (required), description (optional, placeholder “if I pay extra on the card”)
- Show parent name in small type when `parentId` is set

## Comparison

New action on Forecast menu: **Compare with…**

Pick another scenario. Layout:

- Side by side month summaries (ending main balance, lowest point, debt remaining)
- Optional line-level diff of PSV (simple: added / removed / changed lines)
- For each shared debt account id: payoff date baseline vs fork if both compute

Comparison is read-only. “Open this scenario” switches active.

## Storage

Same localStorage mechanism as today. Adding `parentId` and `description` must not break old saved sets — missing fields default to null / "".

Export remains `.psv` for one scenario. All-sets JSON should include the new metadata fields.

## Non-goals

- Automatic ranking
- Three-way compare
- Cloud backup
- Merge / rebase of forks
