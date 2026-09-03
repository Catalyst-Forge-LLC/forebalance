# ForeBalance entry format

ForeBalance projects your account balance forward from a plaintext list — one line per credit, debit, or balance reset. Save your data as a `.psv` (pipe-separated values) file.

Each entry line uses four pipe-separated fields:

```TYPE|WHEN|AMOUNT|DESCRIPTION```

Section comments begin with `---` (for example `--- Income`).

## TYPE

| Code | Meaning |
|---|---|
| **B** | Balance as of a date (resets the running balance) |
| **C** | Credit |
| **D** | Debit |

### Main checking account

Use `-ACCOUNTID-main` on the balance line (case-insensitive):

```B-CHCK5432-main|2026-04-01|1000|Balance Checking 5432```

### Credits and debits on the main account

Omit the account suffix — they apply to the main account:

```C|2026-04-01,R2W|1500|Paycheck every other week
D|2026-04-01,R|1000|Rent```

### Debt and sub-accounts

Bind a line to a sub-account with a type suffix, for example `D-VISA`. Define the sub-account on first use with extra fields:

```TYPE-ACCOUNT|WHEN|AMOUNT|DESCRIPTION|ACCOUNT|STARTING_BAL|RATE1|RATE2|RATE2_DATE```

Example:

```D|2026-04-01|3200|Visa balance|VISA|3200|19.99
D-VISA|2026-04-15,R|150|Visa payment```

ForeBalance tracks running debt balance, monthly interest, and paid-off status on sub-accounts. Use the account picker on the Forecast tab to view each account.

## WHEN — dates and recurrence

Single date: `YYYY-MM-DD` (non-padded days like `2026-2-5` are accepted).

Recurring: `YYYY-MM-DD,R[m][f][c]` or with end date `YYYY-MM-DD,R[m][f],YYYY-MM-DD`

| Part | Meaning |
|---|---|
| **m** | Interval multiple (default 1) |
| **f** | `D` daily, `W` weekly, `M` monthly (default), `Y` yearly |
| **c** | Occurrence count (default: unbounded within forecast window) |

Examples:

| Entry | Meaning |
|---|---|
| `2026-04-01,R` | Monthly from Apr 1 |
| `2026-03-15,R3M` | Every third month from Mar 15 |
| `2026-01-01,RY` | Yearly on Jan 1 |
| `2026-02-01,R2W` | Every two weeks from Feb 1 |
| `2026-02-01,RW5` | Weekly, five times |
| `2026-02-10,R2D,2026-04-10` | Every other day through Apr 10 |

**Month-end behavior:** For monthly recurrence, if the start day does not exist in a month (e.g. 31st in February), ForeBalance clamps to the last day of that month.

## Disable a line without deleting it

Prefix `!` or `#` to exclude a line from the forecast (useful for what-if scenarios):

```!D|2026-04-16,R|500|Savings this month```

## Sort order

On the same calendar date, ForeBalance applies entries in this order:

1. Balance resets (`B`)
2. Credits (`C`)
3. Debits (`D`)
4. Original line order in your file

## Malformed lines

Lines that do not match the expected format are skipped in the forecast and listed as warnings below the Entries editor.

## Persistence

- Data is stored in your browser until you clear site data.
- Use **Import PSV** or drag-and-drop to load a file.
- In supported browsers, **Link file…** saves changes back to a `.psv` file on disk.
- **Download Entries** on Settings always works as a fallback.

Nothing is sent to a server.
