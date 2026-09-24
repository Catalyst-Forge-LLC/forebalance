# Open decisions

Agents must **not** silently pick a permanent product meaning for these. Implement the temporary rule if blocking, and mark a `TODO(spec)` in Help.

## 1. `pct` strategy meaning

**Decided 2026-09-24: percent of the current debt balance.** AMOUNT is that percent (`5` = 5% of remaining balance). It is not a percent of income. `min` stays separate: it pays at least a dollar floor and at least `minRate` of the balance.

## 2. Default `min` rate

**Decided 2026-09-24: try 10% (`0.10`), and always allow a per-account override.** The override is the MIN_RATE extra, a decimal fraction (`0.02` = 2%). Empty MIN_RATE means 0.10.

## 3. MathJSON engine

Options:

- A) `@cortex-js/compute-engine` (correct, heavier)
- B) Minimal allowlisted walker (smaller, enough for this app)

Either is acceptable. Do not use `eval`.

## 4. Autopay serialization

Preferred: explicit token `autopay` / omit. If extras parsing stays positional, document the exact index after named-extra refactor (Slice 0).

## 5. Notes containing `|`

v1 forbidden. Future: escape syntax. Do not add CSV-style quotes yet.

## 6. Cards as default view

Proposed default Cards for first-time; remember last. Owner can flip to Raw-default later.

## 7. Delete vs disable from kebab

v1 primary action = disable with `!`. Hard delete is secondary confirm. Revisit if users find disable confusing.

## 8. Spreadsheet import

Designed, not in the first five slices. Do not block dual-mode on it.

## 9. Shareable HTML snapshot / OFX import / budget envelopes / pattern detection

Raised as future ideas. **Out of this pack** unless the owner reopens them.

## 10. Second APR field UI

Parser already supports APR2 + date. Show both on expanded debt card if present; no new grammar required.
