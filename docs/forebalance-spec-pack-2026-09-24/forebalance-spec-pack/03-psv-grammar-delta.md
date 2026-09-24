# PSV grammar delta

PSV remains pipe-separated. New fields are **optional trailing extras**. Old files must parse unchanged.

## Canonical debt / account payment line (target)

```
TYPE[-ACCOUNT]|WHEN|AMOUNT|DESCRIPTION|ACCOUNT|STARTING_BAL|APR[|APR2|APR2_DATE]|STRATEGY|MIN_RATE|PAY_URL|CATEGORY|NOTES
```

Minimum shipping debt line (already valid):

```
D-CO|2026-04-15,R|150|Capital One-4321|CO|2800|19.99
```

Full example:

```
D-CO|2026-04-15,R|150|Capital One-4321|CO|2800|19.99||fixed||https://www.capitalone.com|debt|refinanced Mar 2026
```

Empty extras are allowed. Trailing pipes may be omitted.

## Field rules

| Field | Required | Notes |
|---|---|---|
| TYPE | yes | `B`, `C`, `D` (and existing `G` if present) |
| ACCOUNT suffix on TYPE | no | `D-CO` binds the payment to account CO |
| WHEN | yes | date or recurrence token |
| AMOUNT | yes | payment or transaction amount; sign from TYPE |
| DESCRIPTION | no | display name; may include `-4321` last four |
| ACCOUNT | first use of a debt | short id, uppercase recommended |
| STARTING_BAL | first use | remaining principal / statement balance at start |
| APR | no | percent, e.g. `19.99` |
| APR2 / APR2_DATE | no | already parsed today as extras[3], extras[4] |
| STRATEGY | no | `fixed` \| `min` \| `pct`. Default `fixed` |
| MIN_RATE | no | Decimal fraction used only when STRATEGY is `min`. `0.02` means 2% of the remaining balance. Empty means **0.10** (10%). |
| PAY_URL | no | `https://` or `http://` only when present. Never a password. |
| CATEGORY | no | category **id**, not display name. Missing → `unfiled` |
| NOTES | no | free text; pipes inside notes must be escaped or forbidden in v1 |

### Notes and pipes (v1 rule)

**v1: notes may not contain `|`.** If the user types a pipe in the card UI, replace it with an en dash or reject with an inline warning. Do not invent a quoting language in v1.

## Strategy semantics

- `fixed` — AMOUNT is the scheduled payment in dollars.
- `min` — engine payment = max(dollar floor, `minRate × runningBal`). The dollar floor is the line AMOUNT when it is filled; otherwise $0.01. `minRate` is MIN_RATE when that extra is present, otherwise **0.10**.
- `pct` — AMOUNT is a percent of the **remaining debt balance**, not dollars and not income. `5` means pay 5% of `runningBal` that month (`0.05 × runningBal`). This is exact, not a floor. `min` is the one that takes the larger of a dollar floor and a rate.

## Category id vs name

Entries store `categoryId`. Display name lives in the category list. Renames do not rewrite every PSV line if we serialize id.  

**Serialization choice (locked):** write the category **id** in the CATEGORY slot. Ids are stable slugs: `utilities`, `housing`, `unfiled`.

If an imported line has a human name that matches a category name case-insensitively, map to that id. Otherwise Unfiled.

## Pay URL

- Store raw URL string.
- Render as a link with `rel="noopener noreferrer"` and `target="_blank"`.
- Reject `javascript:` and non-http(s) schemes.
- Do not fetch the URL. It is a bookmark.

## Grouping comments stay

```
--- Utilities
D|2026-04-01,R|120|Electric
```

`---` lines remain section comments. Categories are a separate, structured field so an entry can keep a section header *and* a category id. If both exist and disagree, **category id wins** for filters; the `---` line is still a visual grouping in Raw.

## Occurrence overrides unchanged

```
D-CO|2026-04-15,R|150|Capital One-4321|CO|2800|19.99|#5=2026-05-20:200
```

Overrides stay at the end as today (`|#N=...`). Parser already splits extras vs overrides. New named extras must be parsed **before** override tokens.

## Disable unchanged

```
!D-CO|2026-04-15,R|150|Capital One-4321|CO|2800|19.99
```

## Balance / account definition

Main checking:

```
B-CHCK5432|2026-04-01|1840.12|Checking-5432
```

A debt does not need its own `B-` line if STARTING_BAL is on the first payment line. Keep that shipping behavior.

## Serializer contract

- Write the shortest line that preserves meaning.
- Omit empty optional extras after the last populated extra, except do not drop ACCOUNT/STARTING_BAL/APR if any later extra is present (keep placeholders).
- Never reorder override tokens relative to extras.
- Round-trip test: parse(serialize(parse(line))) deep-equals parse(line) for fixtures in `10-acceptance-and-tests.md`.
