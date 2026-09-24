# Editable categories

## Purpose

Groupings are not a fixed taxonomy. Ship defaults. The user owns the list.

## Reserved category

| id | name | rules |
|---|---|---|
| `unfiled` | Unfiled | Always present. Cannot rename, delete, or hide. Default for any entry with no category. |

Entries never disappear when a category is removed. They are reassigned to Unfiled (or a category the user picks in the delete dialog).

## Default set (ids stable)

| id | name |
|---|---|
| utilities | Utilities |
| housing | Housing |
| transportation | Transportation |
| food | Food |
| subscriptions | Subscriptions |
| income | Income |
| debt | Debt |
| other | Other |

User may delete any of these except Unfiled. Deleted defaults do not come back unless the user adds them again (new id if they type a new name; if they add “Utilities” again, reuse `utilities` if that id is free).

## Storage

```
Category = { id: string, name: string, color?: string, order: number }
```

List stored in localStorage, not in each `.psv` file, so categories are app-level for this browser.  

**Export rule:** scenario `.psv` stores category **ids** on lines. All-sets JSON should also export the category list so another machine can restore names. If a file is imported alone and an id is unknown, show the id as the name and keep Unfiled only when the slot is empty.

## Management UI

Settings → Categories:

- Ordered list
- Reorder (drag or up/down)
- Inline rename
- Add (slug id from name: lowercase, `[a-z0-9-]+`, collision suffix `-2`)
- Delete → dialog: “N entries will move to Unfiled” or picker “move to [category]”
- Optional color from a small fixed palette (6–8 colors). No free hex picker in v1.

## Command bar

Grouping dropdown is this list + All groups + Unfiled.

Unfiled count badge when count > 0.

## Mapping from `---` section headers

Do not auto-create categories from `---` lines in v1. Section headers remain comments. Users assign categories on the card. Optional later: “create category from this section.”

## Labs

Chips may use the category display name in prompts (“is this utilities spend normal”).
