# Contributing

Forks and local runs are welcome. The point of the tool is to help people plan cashflow without sending their numbers anywhere.

## Run it

```bash
pnpm install
pnpm test
pnpm dev
```

`pnpm dev` prints a local URL (typically `http://127.0.0.1:46000`).

## Changes that fit

- Parser or forecast behavior needs a Vitest case next to the code (`src/lib/parser/`).
- Keep data in the browser. Do not add accounts, cloud sync, or telemetry.
- Copy that describes balances should stay a projection, not a promise about real accounts. This is not financial advice.

## Pull requests

A short “why” and how you checked it (tests, and a Forecast click-through if you touched the UI) is enough.
