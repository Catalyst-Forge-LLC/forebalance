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

A shorter paycheck-and-rent walkthrough, including how rows get threshold marks, is on **[Welcome](/#welcome)**. Those sample numbers are illustrative. They are not personal financial advice.

Section labels start with `---` (for example `--- Income`). They are comments only.

Jump to: [TYPE](#type) · [WHEN](#when) · [One occurrence](#one-occurrence) · [Debt](#debt-and-sub-accounts) · [Disable a line](#disable-a-line) · [Same-day order](#same-day-order) · [Already in balance](#balance-already-includes-todays-items) · [Scenarios](#scenarios)

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

ForeBalance starts from `STARTING_BAL`, adds monthly interest from APR, then subtracts payments. Remaining balance goes down as you pay, though interest can slow that.

Interest is the APR divided by 12, times the remaining balance, added on each payment date before that payment is subtracted. It is not daily compounding. Lenders may use a different method. Change the APR or remaining balance on the line if your statement uses other figures.

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

## One occurrence

On **Forecast**, click a row to change that date or amount. Choose **This one** or **Whole series**.

A one-off line is rewritten. **This one** on a recurring line keeps the series and appends an override for that `#N` only — later occurrences stay on the original cadence:

```
D|2026-04-03,RW|80|Groceries|#5=2026-05-08:65
```

| Override | Meaning |
| --- | --- |
| `#5=65` | Fifth is $65, same scheduled day |
| `#5=2026-05-08` | Fifth moves to May 8, same amount |
| `#5=2026-05-08:65` | Both |

You can stack them: `|#5=65|#8=2026-05-29`. This is not a disable prefix. `#` at the **start** of a line still skips the whole line.

**Whole series** rewrites the line’s date and amount (shifting the start so this occurrence lands on the date you picked) and drops `#N` exceptions.

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

### Balance already includes today's items

A `B` line is the **end-of-day number** by default. Same-day credits and debits still appear on Forecast, marked *in balance*, but they do not add or deduct again. Later repeats of a recurring line forecast as usual.

If one same-day item has not posted yet, open that Forecast row and check **Not yet posted**. That writes `|#1=pending` (or `|#N=pending` for a later occurrence) so only that hit still applies.

```
B-CHCK1775-main|2026-09-15|2000|Balance Checking 1775
D|2026-09-15,R|1645|Rent|#1=pending
C|2026-09-15,R2W|1684|Paycheck
```

Here rent still deducts from the $2000; paycheck on 9/15 stays in the balance. Turn the setting off under Settings if you enter a balance before the day's activity posts.

Broken lines are skipped and listed as warnings under the editor.

## Scenarios

On **Entries** you can keep more than one forecast (a tight month, a what-if, another household). Each one is a **scenario**.

- Switch, rename, clone, or delete (the last scenario stays)
- **Add a starter** copies a built-in profile
- **Import** / **Export** apply to the *current* scenario only
- **Forecast** has the same scenario picker, and always uses the one you selected
- **Settings → Reset** can export every scenario as one JSON copy first

Nothing is sent to a server. See **[Privacy](/#privacy)**. Data lives in this browser until you clear site data. Browser storage is not a durable backup.

## What the forecast assumes

The table is a **projection** from your lines, your month count, and your thresholds. Change a date, amount, or recurrence, and the future rows change. The tool does not connect to a bank and does not know about charges you did not enter.

Debt interest uses the simple monthly model above. Lenders may use a different method. Projected balances are only as accurate as the lines you enter.

**This is not personal financial, tax, legal, or investment advice**, and it is not a promise about real accounts. You are responsible for decisions you make with it. The full disclaimer is on **[About](/#about)**.
