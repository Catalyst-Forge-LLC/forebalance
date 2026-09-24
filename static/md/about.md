# About ForeBalance

See how the cash flows you enter affect your projected balance, and when it crosses your chosen thresholds.

You list paychecks, bills, and the balance you see at the bank. Each item is one short entry. ForeBalance repeats the ones that happen on a schedule, projects the balance forward up to 24 months, and marks days against your goal, uncomfortable, and low thresholds.

## Disclaimer

**ForeBalance is a planning calculator. It is not a bank, advisor, accountant, or credit counselor.**

- This is **not** personal financial, tax, legal, or investment advice.
- The Forecast table is a **projection** from the amounts you enter, the repeat and interest rules on Help, and your Settings. It does not connect to a bank and does not know about charges you left out.
- Those numbers can be wrong. A typo, a missing bill, a payday that slips, or a lender that compounds differently than the simple monthly APR model will change the real balance.
- Threshold marks (goal, uncomfortable, low, negative) are labels you chose. They are not a judgment about what you should do.
- Starter scenarios and sample amounts are made up. They are not a recommendation.
- You are responsible for decisions you make after looking at a forecast.

The software is provided **as-is**, without warranty of any kind, as stated in the [MIT License](https://github.com/Catalyst-Forge-LLC/forebalance/blob/main/LICENSE). Catalyst Forge, LLC is not liable for losses or decisions that follow from using it.

## How to use it

1. **Entries.** Pick a starter scenario, rename it, or enter your own amounts. Import or drop a saved file (`.psv`) to replace the current scenario.
2. **Forecast.** Scan the table, chart, and the days that cross a threshold. Switch scenarios here too.
3. **Settings.** How many months to look ahead, and where uncomfortable starts.
4. **Help.** Repeating items, accounts, debt, and how to write an entry.

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
