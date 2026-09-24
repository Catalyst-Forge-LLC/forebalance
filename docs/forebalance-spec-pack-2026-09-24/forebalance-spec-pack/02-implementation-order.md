# Implementation order

Build in this order so each slice is shippable and testable.

## Slice 0 — Grammar and types (no UI)

- Extend `Account` / `ParsedEntry` types for strategy, payUrl, notes, categoryId.
- Extend parser + serializer so new fields round-trip.
- Unknown extra fields must not crash parse; warn and preserve raw line when possible.
- Tests: parse fixtures for old lines (no new fields) and new lines.

**Done when:** old `.psv` files still parse identically; new fields survive edit → serialize → parse.

## Slice 1 — Categories

- Category store in localStorage.
- Default set + reserved Unfiled.
- Settings list UI: add, rename, reorder, delete-with-reassign.
- Bind entries to `categoryId`.
- Command bar grouping dropdown reads the live list.

**Done when:** delete Utilities moves those entries to Unfiled; rename does not orphan history.

## Slice 2 — Dual-mode editor shell

- View toggle: Raw | Cards.
- Command bar: type filter + group filter.
- Card list from parsed entries (not from a second store).
- Kebab: clone, delete (confirm), edit.
- Click/tap expands; Escape / close / click-away auto-saves.
- Writes go through the same text-update path as CodeMirror so last-20 history records them.

**Done when:** edit a card, switch to Raw, see the same line changed; undo via previous versions works.

## Slice 3 — Expanded card fields

- Common fields for C/D/B: type, when, amount, description, recurrence, overrides, category, disable.
- Account/debt extra pane when the entry is bound to a non-main account or carries debt extras.
- Notes, pay URL (link + edit), strategy.

**Done when:** a Capital One line can be edited entirely from the card and serializes to valid PSV.

## Slice 4 — Debt intelligence (deterministic, no LLM)

- Payoff projection from current engine rules (monthly APR/12).
- What-if slider: extra monthly payment; live payoff + interest totals.
- Autopay flag + due-day display (derived from WHEN / recurrence, plus optional explicit due day if added to grammar).
- Payment history from expanded occurrences of that account.

**Done when:** changing strategy or slider updates projection without calling Labs.

## Slice 5 — Scenarios as what-if

- Relabel clone as Fork / What-if.
- Parent pointer + description on the scenario record.
- Comparison view: two forecasts or a diff of balances / debt payoff dates.

**Done when:** user can fork “if I pay $50 extra”, edit the fork, compare to parent.

## Slice 6 — Labs per-card + MathJSON

- Chips + free-text on expanded card.
- Context payload: this entry + account + recent related occurrences.
- System prompt with MathJSON examples.
- Safe evaluator; show formula under the number.
- Golden tests for format + numeric result.

**Done when:** “When will this be paid off?” returns a number from JS eval, not from the model doing arithmetic.

## Parallel / anytime

- Help markdown updates for new fields.
- `docs/forebalance-spec.md` delta merge after slices land.
- Accessibility: keyboard expand/collapse, kebab, filters.

## Do not start with

- Visual polish before parse/serialize.
- LLM payoff math before deterministic payoff exists.
- New file formats that are not `.psv` / existing all-sets JSON.
