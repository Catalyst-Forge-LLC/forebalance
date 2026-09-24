# Data model and persistence

## Source of truth

1. Scenario **text** (PSV string) is canonical for entries.
2. Category list is app-level localStorage.
3. Settings remain the existing settings store.
4. Derived: parse(text) → `AccountEntries` + `Accounts` + card view models.

Never persist a card layout that cannot be rebuilt from text + category list.

## Types to add (illustrative)

```ts
type PaymentStrategy = 'fixed' | 'min' | 'pct';

interface Account {
  id: string;
  isMain: boolean;
  startingBal: number;
  runningBal: number;
  name?: string;
  lastFour?: string;
  interestRate?: number;
  interestRate2?: number;
  interestRate2Date?: string | null;
  extraPayment?: number;
  strategy?: PaymentStrategy;
  minRate?: number;      // fraction. Absent means 0.10 when strategy === 'min'. 0.02 means 2%
  payUrl?: string;
  notes?: string;
  categoryId?: string;
  autopay?: boolean;
}

interface Category {
  id: string;
  name: string;
  color?: string;
  order: number;
}

interface ScenarioMeta {
  id: string;
  name: string;
  description?: string;
  parentId?: string | null;
  createdAt: string;
}
```

`ParsedEntry` should carry `categoryId`, `payUrl`, `notes` when those extras were on the line, even if they also live on `Account`.

## Persistence keys

Reuse existing entry-set keys. Additive fields only.

Suggested new keys:

- `forebalance.categories.v1`
- scenario records gain `description`, `parentId`

Migrate: if categories key missing, write the default set once.

## Import / export

| Action | Behavior |
|---|---|
| Export scenario `.psv` | text only, category ids on lines |
| Export all-sets JSON | scenarios + settings currency + category list |
| Import `.psv` | new scenario; unknown category ids kept as-is; empty slot → unfiled |
| Reset | existing RESET flow; optional export first |

## Security / privacy

- No network for ledger data.
- Pay URL click is a user-initiated navigation.
- Labs model download is user-initiated.
- Do not put notes or balances into AppFacts, analytics, or error reports.
- Sanitize pay URLs.

## Performance

Card list should render parsed entries already produced for Forecast. Do not reparse per keystroke beyond the current editor debounce.
