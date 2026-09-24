# ForeBalance

See how the cash flows you enter affect your projected balance, and when it crosses your chosen thresholds.

ForeBalance projects a checking balance from the paychecks, bills, and bank balances you enter. Each item is one short entry in a saved file (`.psv`). Data stays in this browser. There are no accounts, no tracking, and no server-side data.

**Live:** [forebalance.app](https://forebalance.app)

The npm name `forebalance` is a hold (`0.0.1`). It does not install this app. Clone the repo or use the site.

**This is not personal financial, tax, legal, or investment advice.** The table is a projection from the amounts you enter. It is not a statement about real accounts, and it is not a recommendation to spend, save, borrow, or invest. The software is provided as-is under the [MIT License](LICENSE), without warranty.

## Quick start

```bash
pnpm install
localslip claim forebalance --port 46000   # once, optional but recommended
pnpm dev
```

Open the URL Vite prints (typically `http://127.0.0.1:46000`).

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Dev server (port from LocalSlip lease `forebalance`, fallback 46000) |
| `pnpm test` | Run Vitest |
| `pnpm build` | Production static build → `build/` |
| `pnpm preview` | Preview production build locally |
| `pnpm ship` | Build and deploy to Cloudflare Pages via Wrangler |
| `pnpm lint` | Prettier + ESLint |
| `pnpm format` | Prettier write |

## Entry format

```
TYPE|WHEN|AMOUNT|DESCRIPTION
```

`B` is a balance you read from the bank, `C` is money in, `D` is money out, and `,R` repeats monthly. The Welcome page loads this example:

```
B-CHCK1000-main|2026-09-01|420|Starting checking
C|2026-09-15,R|1800|Paycheck
D|2026-09-01,R|1500|Rent
```

The `B` entry is checking on the 1st after rent clears: $420. A balance is the end-of-day number by default, so same-day money in and money out are already in it and do not change the balance again (turn this off in Settings if you enter the balance before the day's activity posts). The paycheck on the 15th brings checking to $2,220. On a day with no balance entered, money in is counted before money out, and items of the same kind keep their file order.

See the in-app **Help** tab or `docs/forebalance-spec.md` for the rest of the format (repeating items, more than one account, debt).

<!-- xfacts-label -->

## xFacts label

- **AppFacts:** [viewer](https://appfacts.dev/v#af1.eNptkk1v2zAMhv-KwdMKKA161WldgG7FWqBAul2GYaAlxlYtS4JIJzOC_PdBtvNx2E0iH5IvX-kIe9APCgL2BBqeYqYv6DEYAgUyphI8UF1hStWn7dvjHShgQRkYNKARty-gd4YCF_b1-X0mTAf6CB5DM2BTMu9joq3JLgkoyEMQN02sczwwZVCwy9jTIeYONGz35IW-O5majd6FpkSRGRSQdRIzaNhES68u55gnLOZ5ko8G_Xa5Kmgjy1y_8XGwO4-ZqjdsqPSqB-ctaPjphOCkwFJi0L-OEEDDZ55kfPC6m5SkW2WTJdyS93BSMz_jC_jj-RK_9kGLSSivioXOLOR8qehvilkuRSZa6s_LFUwyBi6Wx1AtFpxZi-MHL5hFoapHaS_ZHnNHdkm7sCrCW_KpwmArrONwHcqzw7Oq0RPD6bcC3puLJ__xMF93OHtdqhZrj5DQdNjQnx4DNlToFFJf_hexgIa9mw4KjAMNX518G-rqcVqUy5u0sac0P20rkliv17uYqZ7_6T2mVERQilxMGW-wxkk71Pcm9usNCvqRZfUUc0Orl5fNbRM4_QOCAQLO) · [raw](https://github.com/Catalyst-Forge-LLC/forebalance/blob/main/APP_FACTS.md)

## License

[MIT](LICENSE). Copyright © 2020–2026 Catalyst Forge, LLC. Fork it, run it locally, or ship your own build. That is the point. See [CONTRIBUTING.md](CONTRIBUTING.md) if you want to send a change.

## Stack

- SvelteKit 2 + Svelte 5
- TypeScript
- `adapter-static` → Cloudflare Pages (`wrangler.jsonc`)
- LocalSlip for dev port · LocalHelm for fleet · ForgeTrail for lifecycle

[See the rest of the Catalyst Forge shelf.](https://catalystforge.com/tools/)
