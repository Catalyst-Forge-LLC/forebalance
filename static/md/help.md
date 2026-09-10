# How to write entries

One line per transaction. Fields are separated by `|`:

```
TYPE|WHEN|AMOUNT|DESCRIPTION
```

Example:

```
B-CHCK1775-main|2026-04-01|1840|Balance Checking 1775
C|2026-04-01,R2W|1684|Paycheck
D|2026-04-01,R<|1645|Rent
```

Section labels start with `---` (for example `--- Income`). They are comments only.

Jump to: [TYPE](#type) · [WHEN](#when) · [Debt](#debt-and-sub-accounts) · [Disable a line](#disable-a-line) · [Sets](#entry-sets)

## TYPE

| Code | Meaning |
| --- | --- |
| **B** | Balance as of a date (resets the running balance) |
| **C** | Credit (money in) |
| **D** | Debit (money out) |

### Main checking

Put `-ACCOUNTID-main` on the balance line:

```
B-CHCK5432-main|2026-04-01|1000|Balance Checking 5432
```

Credits and debits with no suffix apply to that main account.

### Debt and sub-accounts

Bind a payment with a type suffix (`D-CO`) and define the account on first use:

```
TYPE-ACCOUNT|WHEN|AMOUNT|DESCRIPTION|ACCOUNT|STARTING_BAL|APR
```

Name goes in DESCRIPTION. A trailing `-4321` is the last four of the account number:

```
D-CO|2026-04-15,R|150|Capital One-4321|CO|2800|19.99
```

Or split name and last-four across pipes:

```
D|2026-04-15,R|150|Capital One|4321|2800|19.99
```

ForeBalance starts from `STARTING_BAL`, adds monthly interest from APR, then subtracts payments. Remaining balance goes down as you pay (interest can slow that).

## WHEN

Single date: `YYYY-MM-DD` (unpadded days like `2026-2-5` work).

Recurring: `YYYY-MM-DD,R[m][f][c]` or with an end date `YYYY-MM-DD,R[m][f],YYYY-MM-DD`

| Part | Meaning |
| --- | --- |
| **m** | Interval multiple (default 1) |
| **f** | `D` daily, `W` weekly, `M` monthly (default), `Y` yearly |
| **c** | How many times (default: until the forecast window ends) |

| Example | Meaning |
| --- | --- |
| `2026-04-01,R` | Monthly from Apr 1 |
| `2026-03-15,R3M` | Every third month from Mar 15 |
| `2026-01-01,RY` | Yearly on Jan 1 |
| `2026-02-01,R2W` | Every two weeks from Feb 1 |
| `2026-02-01,RW5` | Weekly, five times |
| `2026-02-10,R2D,2026-04-10` | Every other day through Apr 10 |

**Missing days:** monthly `2026-01-31,R` clamps to the last day of short months (Feb 28/29).

**Last day of every month:** `2026-01-L` or `RML`:

```
D|2026-01-L,RML|1200|Mortgage
```

**Business days:** append `<` (previous) or `>` (next) to the recurrence. Weekends (and optional US federal holidays in Settings) move the date:

```
D|2026-09-05,R<|1000|Rent
```

## Disable a line

Prefix `!` or `#` to skip a line without deleting it:

```
!D|2026-04-16,R|500|Savings this month
```

## Same-day order

1. Balance resets (`B`)
2. Credits (`C`)
3. Debits (`D`)
4. Original line order

Broken lines are skipped and listed as warnings under the editor.

## Entry sets

On **Entries** you can keep more than one forecast (a tight month, a what-if, another household).

- Switch, rename, clone, or delete (the last set stays)
- **Add a starter** copies a built-in 2026 profile
- **Import** / **Export** apply to the *current* set only
- **Forecast** always uses the set selected on Entries

Nothing is sent to a server. Data lives in this browser until you clear site data.
