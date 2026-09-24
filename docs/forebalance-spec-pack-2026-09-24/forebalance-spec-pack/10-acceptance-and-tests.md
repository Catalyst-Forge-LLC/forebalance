# Acceptance criteria and tests

## Product acceptance (human)

1. Open a file that only uses the old 4-field lines. Forecast matches pre-change.
2. Toggle Cards / Raw. Same entries. Edit amount on a card; Raw shows the new amount; Previous versions can restore.
3. Filter Debits + Unfiled. Only those cards show.
4. Delete category Food while two entries use it. Those entries are Unfiled, still in the file.
5. Expand a debt card. Change APR. Payoff numbers update without Labs.
6. Move what-if slider. Preview changes. Apply writes extra payment and Raw reflects it.
7. Fork scenario “pay extra.” Parent text unchanged. Compare shows different debt remaining.
8. Pay URL “Open” only happens on click and uses https.
9. Chip “When will this be paid off?” works with Labs disabled (deterministic path).
10. Invalid date on expanded card refuses to close-save.

## Parser fixtures

Include at least:

```
D-CO|2026-04-15,R|150|Capital One-4321|CO|2800|19.99
D-CO|2026-04-15,R|150|Capital One-4321|CO|2800|19.99||fixed||https://www.capitalone.com|debt|refi note|autopay
D-CO|2026-04-15,R|150|Capital One-4321|CO|2800|19.99||min|0.02|https://www.capitalone.com|debt|refi note|autopay
D-CO|2026-04-15,R|5|Capital One-4321|CO|2800|19.99||pct||https://www.capitalone.com|debt|five percent of balance
D|2026-04-03,RW|80|Groceries|#5=2026-05-08:65
!D|2026-04-16,R|500|Savings
B-CHCK5432|2026-04-01|1840.12|Checking-5432
--- Utilities
D|2026-04-01,R|120|Electric
```

Assert: old first line still creates account CO with startingBal 2800 and apr 19.99.

Round-trip: serialize(parse(line)) parses to equal structured fields.

## Debt math fixtures

Starting 2800, APR 19.99, fixed 150, no extra:

- First month interest ≈ 2800 * 0.1999 / 12
- Then subtract 150
- Paid-off flag eventually appears inside a long enough window or reports beyond window

What-if extra 50: months-to-payoff strictly ≤ baseline.

Do not assert lender-statement equality.

## MathJSON fixtures

Eval `["Multiply", "balance", ["Divide", "apr", 1200]]` with `{balance: 2800, apr: 19.99}` ≈ 46.64333.

Reject `["Call", "eval", "alert(1)"]` or unknown operators.

Host shortcut: payoff chip does not need a model response to show a number.

## History

20-cap still holds. Card save of unchanged values does not consume a slot. Card save of a changed amount does.

## Regression

Existing recurrence, `R<` `R>`, `RML`, `|#N=pending`, same-day B, multi-account selector, currency export still pass current Vitest suite.
