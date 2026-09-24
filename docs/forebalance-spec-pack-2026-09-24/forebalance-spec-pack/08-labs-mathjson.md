# Labs + MathJSON

## Purpose

Local models (Gemini Nano in Chrome, WebLLM, or a user-loaded local LLM) answer questions about **this card’s** data. They must not be trusted to finish arithmetic.

## Placement

On the expanded card, below the deterministic payoff block:

1. Two or three chips (prompts)
2. One free-text field
3. Answer region: prose + formula + computed number

Labs stay opt-in. Do not download a model until the user opens Labs or taps a chip.

## Context payload (injected, not shown raw unless debug)

```
{
  "entry": { "type", "desc", "amount", "when", "recur", "categoryName", "accountId" },
  "account": {
    "id", "name", "lastFour", "runningBal", "startingBal",
    "apr", "apr2", "apr2Date", "strategy", "extraPayment", "payUrl"
  },
  "history": [ { "date", "amount", "interest", "remaining" } ],
  "main": { "runningBal", "currency" },
  "settings": { "monthsToForecast", "currencyIsoCode" }
}
```

No pay-URL passwords (there are none). Do not send other scenarios unless the user asks to compare.

## Chip sets

**Debt / card**

- When will this be paid off at my current rate?
- How much interest is this costing me this year in the forecast?
- If I add $50 a month, when does it finish?

**Main balance / B line**

- Am I on track for my low-balance threshold this month?
- What is the trend of this account over the forecast?

**Recurring bill (non-debt D/C)**

- Is this month’s amount normal for me?
- When does this usually spike?

Chips fill the prompt and run. User can edit the text first.

## Why MathJSON

MathJSON is a JSON tree for math, used by MathLive / Cortex Compute Engine.

Examples:

```json
["Add", ["Power", "x", 2], ["Multiply", 2, "x"], 1]
["Divide", ["Multiply", "balance", ["Divide", "apr", 1200]], 1]
```

Most small models will **not** emit perfect MathJSON without a system prompt and few-shots. That is expected. Tests must catch format failures separately from numeric failures.

Optional dependency: `@cortex-js/compute-engine`. If bundle size is a concern, implement a **minimal walker** that only allows:

`Add`, `Subtract`, `Multiply`, `Divide`, `Negate`, `Power`, `Sqrt`, `Abs`, `Min`, `Max`, `Ceil`, `Floor`, `Round`

and numbers / symbol names from the provided `variables` map.

**No `eval`. No `new Function` on model text.**

## Model output contract

The model must return JSON only:

```json
{
  "answer": "At $150 / month this card pays off in 22 months.",
  "formula": ["Divide", "balance", "payment"],
  "variables": {
    "balance": 2800,
    "payment": 150
  },
  "confidence": "formula"
}
```

`confidence`:

- `formula` — JS should evaluate `formula` with `variables`
- `prose` — no reliable formula; show `answer` only and label it as unverified language
- `refuse` — cannot answer from provided context

If `formula` is present, **display the evaluated number as the headline**, then the prose, then a humanized equation.

If parse or eval fails, show the prose with “could not verify the math” and do not invent a number.

## System prompt requirements

Include:

- You only see this user’s local entries. Do not invent accounts.
- Do not compute final dollar/month totals yourself. Emit MathJSON.
- Allowed operators list.
- Two few-shot examples (payoff months approximation; interest for one month).
- JSON only. No markdown fences if the host can enforce JSON mode.

Few-shot 1 (monthly interest):

User context: balance 2800, apr 19.99  
Formula: `["Multiply", "balance", ["Divide", "apr", 1200]]`  
Variables: `{ "balance": 2800, "apr": 19.99 }`

Few-shot 2 (months if no interest, as a lower bound):

`["Ceil", ["Divide", "balance", "payment"]]`

Remind the model that real payoff with interest is **not** balance/payment; prefer asking the host to use the app’s deterministic payoff when the question is “when paid off.”

## Host-side shortcut (important)

If the chip is exactly a known payoff / what-if question, **skip the model** and use Slice 4 deterministic math. Use the model for fuzzy questions and explanations.

This is the highest-reliability path and matches owner intent.

## Tests

See `10-acceptance-and-tests.md`. Split:

- A: fixture JSON parses as allowed MathJSON
- B: eval(formula, variables) equals expected ± $0.01 or 0 months
- C: model-output fixture with bad operator is rejected
- D: chip “when paid off” never depends on model arithmetic
