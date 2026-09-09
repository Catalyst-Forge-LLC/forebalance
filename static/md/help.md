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

Bind a line to a sub-account with a type suffix, for example `D-CO`. Define the sub-account on first use with extra fields:

```TYPE-ACCOUNT|WHEN|AMOUNT|DESCRIPTION|ACCOUNT|STARTING_BAL|APR|APR2|APR2_DATE```

Put the friendly name in DESCRIPTION. A trailing `-4321` is treated as the last four of the account number. You can also use a short id in the ACCOUNT field (or a numeric last-four) if you prefer the name and number in separate pipes:

```D-CO|2026-04-15,R|150|Capital One-4321|CO|2800|19.99
D|2026-04-15,R|150|Capital One|4321|2800|19.99```

ForeBalance starts from STARTING_BAL, adds monthly interest from APR, then subtracts payments. The Forecast picker shows **name-last4 · remaining balance · APR**, and remaining goes down as the account is paid off (interest can slow that).

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

**Last day of month:** Use `-L` in the date (`2026-01-L`) or `RML` as the recurrence code to always land on the last calendar day of each month:

```D|2026-01-L,RML|1200|Mortgage end of month```

### Business-day shifting

Append `<` or `>` to the recurrence code to shift dates that fall on weekends (and optionally US federal holidays):

| Modifier | Meaning |
|---|---|
| `R<` | Previous business day |
| `R>` | Next business day |
| (none) | No shift (default) |

Example — rent due on the 5th, paid the prior business day if the 5th is a weekend:

```D|2026-09-05,R<|1000|Rent```

Enable **US federal holidays** in Settings to treat observed federal holidays as non-business days. Bank holidays may differ from the federal calendar.

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
- **Entries** holds multiple named forecasts. Switch, rename, clone, or delete (the last set cannot be deleted). **Add a starter** copies a built-in 2026 profile. Forecast always uses the set selected there.
- Use **Import PSV** or drag-and-drop to replace the *current* set.
- In supported browsers, **Link file…** saves the current set back to a `.psv` file on disk.
- **Download** on Entries always works as a fallback.

Nothing is sent to a server.
