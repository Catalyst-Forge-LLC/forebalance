# ForeBalance

**Cashflow sanity, in plain text.**

ForeBalance projects your account balance forward from a plaintext list of credits, debits, and balance resets. One line per transaction, pipe-separated (`.psv`). Everything stays in your browser — no accounts, no tracking, no server-side data.

**Live:** [forebalance.app](https://forebalance.app) (coming soon) · Legacy: [mybalanceforecaster.com](https://mybalanceforecaster.com)

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

## Stack

- SvelteKit + Svelte (migrating to 5)
- TypeScript (migrating)
- `adapter-static` → Cloudflare Pages (`wrangler.jsonc`)
- LocalSlip for dev port · LocalHelm for fleet · ForgeTrail for lifecycle

## License

Copyright © Catalyst Forge, LLC
