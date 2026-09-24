# Decisions

These were open during the pack. Each one is decided as of 2026-09-24.

## 1. `pct` strategy meaning

**Decided 2026-09-24: percent of the current debt balance.** AMOUNT is that percent (`5` = 5% of remaining balance). It is not a percent of income. `min` stays separate: it pays at least a dollar floor and at least `minRate` of the balance.

## 2. Default `min` rate

**Decided 2026-09-24: try 10% (`0.10`), and always allow a per-account override.** The override is the MIN_RATE extra, a decimal fraction (`0.02` = 2%). Empty MIN_RATE means 0.10.

## 3. MathJSON engine

**Decided 2026-09-24: Option B, a minimal allowlisted walker.** Do not use `eval`. Do not add `@cortex-js/compute-engine`.

## 4. Autopay serialization

**Decided 2026-09-24: the preferred form.** Write the token `autopay` when it is on. Omit the token when it was never set. Write `noautopay` only after it is turned off.

## 5. Notes containing `|`

**Decided 2026-09-24: forbidden for now.** Reject a pipe in the card. No escape syntax yet.

## 6. Cards as default view

**Decided 2026-09-24: Cards on a first visit, and remember the last view for each scenario.**

## 7. Delete vs disable from kebab

**Decided 2026-09-24: offer both.** Delete turns the line off with `!` and leaves it in the file. Hard delete removes the line and always asks first.

## 8. Spreadsheet import

**Decided 2026-09-24: skip for now.**

## 9. Shareable HTML snapshot / OFX import / budget envelopes / pattern detection

**Decided 2026-09-24: skip for now.**

## 10. Second APR field UI

**Decided 2026-09-24: agreed.** Show the second APR and its date on the expanded debt card when they are present. No new grammar.
