# About ForeBalance

See how the cash flows you enter affect your projected balance, and when it crosses your chosen thresholds.

You describe cashflow as plain text, one line per credit, debit, or balance reset, in a compact pipe-separated format (`.psv`). ForeBalance expands recurring lines, runs a running balance forward up to 24 months, and marks rows against your goal, uncomfortable, and low thresholds.

## Disclaimer

**ForeBalance is a planning calculator. It is not a bank, advisor, accountant, or credit counselor.**

- This is **not** personal financial, tax, legal, or investment advice.
- The Forecast table is a **projection** from the lines you typed, the recurrence and interest rules on Help, and your Settings. It does not connect to a bank and does not know about charges you left out.
- Those numbers can be wrong. A typo, a missing bill, a payday that slips, or a lender that compounds differently than the simple monthly APR model will change the real balance.
- Threshold marks (goal, uncomfortable, low, negative) are labels you chose. They are not a judgment about what you should do.
- Starter scenarios and sample amounts are made up. They are not a recommendation.
- You are responsible for decisions you make after looking at a forecast.

The software is provided **as-is**, without warranty of any kind, as stated in the [MIT License](https://github.com/Catalyst-Forge-LLC/forebalance/blob/main/LICENSE). Catalyst Forge, LLC is not liable for losses or decisions that follow from using it.

## How to use it

1. **Entries.** Pick a starter scenario, rename it, or type your own lines. Import or drop a `.psv` to replace the current scenario.
2. **Forecast.** Scan the ledger, chart, and at-a-glance crossings. Switch scenarios here too.
3. **Settings.** How many months to look ahead, and where uncomfortable starts.
4. **Help.** Recurrence, accounts, debt lines, and the full entry syntax.

## Saving your work

Scenarios, thresholds, and the month count stay in this browser on this device. Clearing site data deletes them. Browser storage is not a durable backup.

Use **Export** on Entries for the current scenario, or export every scenario from the Reset dialog on Settings. A linked file, when your browser supports it, is also only on your disk.

## License

ForeBalance is free to use. There is no paywall and no account. The source is [MIT licensed](https://github.com/Catalyst-Forge-LLC/forebalance). Forks and local copies are welcome.

## Multi-account and debt

The format supports a main checking account plus linked debt accounts with interest and remaining-balance tracking. The Forecast picker lists each account by name, remaining, and APR.

Interest is the APR divided by 12, times the remaining balance, added on each payment date before that payment is subtracted. That is a simple monthly model, not the method every lender uses.

## The project

ForeBalance is maintained by [Catalyst Forge, LLC](https://github.com/Catalyst-Forge-LLC) as a free-to-use tool.

See **[Privacy](/#privacy)** for the local-only guarantee.
