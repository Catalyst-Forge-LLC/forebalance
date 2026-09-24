# Dual-mode editor

## Purpose

Less-technical users edit cards. Technical users edit PSV. Same file.

## Views

Toggle on the Entries toolbar: **Cards** | **Raw**.

- Raw = existing CodeMirror PSV editor.
- Cards = list of entry cards driven by the parsed model.
- Switching views does not rewrite the file except to persist an in-progress expanded-card save.

Default for new visitors: Cards. Remember last view per scenario in localStorage.

## Command bar (Cards view)

Left: segmented control **All | Credits | Debits**  
(`B` lines appear in All. Optional later: Balances segment — not required in v1.)

Right: grouping dropdown:

- All groups
- Unfiled (always present)
- Each user category, in user order
- Ungrouped `---` sections may also appear as labels if we keep section headers; do not duplicate if the category list already covers them.

Filters compose with AND. “Debits + Utilities” shows debit entries whose category is utilities.

Show counts on the segments when cheap: `Debits (12)`.

Unfiled badge: if Unfiled count > 0, show a quiet count on the dropdown or bar. Never block the user.

## Card (collapsed)

Visible at a glance:

- Type chip (C / D / B)
- Description
- Amount
- When (human: “Apr 15 · monthly” or “Apr 3 once”)
- Category name (or Unfiled)
- If debt: small remaining-balance hint if known

Hover / focus: kebab (⋮).

Kebab actions:

- Edit (same as opening the card)
- Clone (duplicate the source line; new id; history records the whole file)
- Delete — confirm. Delete removes or disables? **v1: disable with `!` prefix**, matching “nothing disappears.” Offer “Remove line” as a secondary confirm option that actually deletes the line.

## Expand

- Click or tap card body opens edit.
- Card expands (animation) and covers / dims the rest of the list.
- Kebab remains available while expanded.
- Close: Escape, close icon, click on the dimmed backdrop.
- Close **always saves** if the parsed fields are valid.
- If fields are invalid (bad date, bad URL scheme), stay open and show inline errors. Do not write a broken line.
- If valid but user made no change, do not push a history snapshot.

## History

Expanded-card saves use the same pipeline as typing in Raw:

1. Rebuild the affected line(s) from the card fields.
2. Replace those lines in the scenario text.
3. Persist.
4. If text changed, push onto the last-20 full-text stack.

No separate card-history stack.

## Recurrence and overrides in the card

Collapsed: show cadence only.

Expanded:

- Schedule: once | daily | weekly | monthly | yearly, plus interval multiple, optional end date or count, business-day shift, last-day-of-month.
- Overrides list: occurrence #, date and/or amount and/or pending. Add / remove override rows. These serialize to `|#N=...`.

Changing “this one occurrence” from the Forecast table already writes `|#N=`. Cards must produce the same tokens.

## Mobile

Tap-to-edit is accepted. Backdrop tap saves and closes. Kebab target ≥ 44px. Command bar may wrap.

## Accessibility

- Cards are focusable buttons or listitems with Enter to expand.
- Expanded card is a dialog or application region with focus trap.
- Escape closes.
- Filters are native controls, not custom-only clickables.

## Non-goals

- Drag-and-drop reorder of cards that silently rewrites file order without a deliberate control. File order stays source order unless the user edits Raw or we add an explicit “move” action later.
- A third “calendar” view in this increment.
