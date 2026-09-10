# ForeBalance

See how the cash flows you enter affect your projected balance, and when it crosses your chosen thresholds.

ForeBalance projects a checking balance from a plaintext list of credits, debits, and balance resets. One line per transaction, pipe-separated (`.psv`). Data stays in this browser. There are no accounts, no tracking, and no server-side data. Projected balances follow the lines you type. They are not a promise about real accounts.

**Live:** [forebalance.app](https://forebalance.app) · Legacy: [mybalanceforecaster.com](https://mybalanceforecaster.com)

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

See the in-app **Help** tab or `docs/forebalance-spec.md` for the full DSL (recurrence, multi-account, debt).

## Access and terms

ForeBalance is free to use in your browser. There is no paywall.

The source is not public. Copyright © Catalyst Forge, LLC. All rights reserved.

## Stack

- SvelteKit 2 + Svelte 5
- TypeScript
- `adapter-static` → Cloudflare Pages (`wrangler.jsonc`)
- LocalSlip for dev port · LocalHelm for fleet · ForgeTrail for lifecycle
