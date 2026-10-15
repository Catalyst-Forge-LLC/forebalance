# ForeBalance modernization — 2026-10-13

This delivery keeps ForeBalance a static, browser-local PSV forecaster. It addresses data safety before tooling, dependencies, and measured performance. No deployment is included.

## Data safety

- New shared links use `#entries?share=...`; scenario text is absent from HTTP request URLs. Legacy query links remain readable and are removed from the address bar after consumption. Anyone with a link can read its contents; Privacy now explains this and the legacy-query limitation.
- Saved starter scenarios are never silently replaced. Updated examples apply only to newly created scenarios.
- Linked files carry a scenario owner. Selection is provisional until import confirmation and write permission. Saves are serialized and capture ownership and link generation; stale saves cannot target a newly linked file. Metadata changes are serialized too.
- Startup restores file ownership without importing disk contents over browser entries. Legacy unowned file handles require explicit relinking. Reset invalidates pending saves and detaches the file.
- Outgoing editor commits retain their original scenario ID. Editor drafts flush on blur, component destruction, and page hide. Clearing raw entries is supported.
- Browser-storage failures retain current edits in memory and show an export warning. Invalid settings fall back field by field; corrupt scenario/settings text is retained under a `.recovery` key. Settings and scenario writes carry storage version 1.
- Account tooltip content is plain text, including imported account names.

## Tooling and dependencies

- Svelte 5.57.2, SvelteKit 2.70.3, Vite 8.3.4, Svelte Vite plugin 7.3.1, TypeScript 5.9.3, ESLint 10, Sass 1.105.1, and Marked 18.1.1, with compatible patch updates in the lockfile.
- SvelteKit 3.0.1 was confirmed stable through the registry. It is deferred as a separate migration: Kit 3 changes configuration/import conventions and requires TypeScript 6, while the present compatible Kit 2/Vite 8 combination meets this delivery's needs.
- Removed the unused Markdown string plugin and redundant TypeScript ESLint dependencies. Updated the obsolete sharp pin and transitive resolutions. `pnpm audit` reports zero advisories at verification time.
- Node 22.17+ and pnpm 10.30.1 are declared. Frozen-lockfile installation is verified.
- CI runs formatting, ESLint, Svelte/TypeScript checks, unit tests, production build, and Playwright in Chromium, Firefox, and WebKit.
- Source and configuration formatting were normalized to make the formatting gate enforceable. Historical records and vendored static files are outside that formatting scope.
- ESLint's generic assignment analysis is disabled only for Svelte components because it cannot model legacy reactive reads. Strict Svelte/TypeScript checking remains enabled. Root-hosted anchor navigation is exempt from the SvelteKit resolve-link convention. Only repository-owned documentation is exempt from the raw-HTML lint rule.

## Performance and component improvements

- CodeMirror loads on opening Raw mode. Optional WebLLM remains lazy. Browser tests check that editor and AI entry modules are absent from initial requests and the editor loads when requested.
- Date and month formatters are constructed once per settings change instead of once per forecast row. Recurrence expansion advances an array cursor instead of repeatedly shifting the queue.
- Local `pnpm bench` results for 24-month forecasts:

| Fixture | Before, mean | After, mean |
| --- | ---: | ---: |
| 100 recurring lines | 158.24 ms | 37.59 ms |
| 1,000 recurring lines | 1,806.57 ms | 318.99 ms |

These are local microbenchmarks, not field Core Web Vitals. Before/after runs had different sample counts and the larger baseline had substantial variance. They demonstrate a useful reduction in parser/formatting work, not a guaranteed device-level speedup.

- Forecast and tab state now have explicit types. Recurrence editing is extracted into `EntryWhen.svelte`; native modal setup is shared through an action. Editor and fork dialogs use native focus containment and Escape behavior.
- Repeated elements have keys; menu semantics, toolbar focusability, and Sass declaration ordering are corrected. Native dialog and narrow-screen behavior are covered in browser tests.
- No table virtualization or worker rewrite was added without evidence it was necessary. Very large scenarios still have main-thread calculation and rendering costs; field INP/LCP/CLS were not measured in this local delivery.

## Verification and operational notes

Final verification passed: 196 unit tests in 38 files, and 27 browser checks across Chromium, Firefox, and WebKit. Formatting/ESLint, production build, and frozen-lockfile installation passed. Svelte/TypeScript reported zero errors and zero warnings; the dependency audit reported zero vulnerabilities. `git diff --check` also passed. Changes remain local and uncommitted; nothing was deployed.

Run `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm check`, `pnpm test`, `pnpm build`, and `pnpm test:e2e`. Install browser runtimes first with `pnpm exec playwright install chromium firefox webkit`; CI includes Linux browser dependencies. `pnpm bench` reruns the calculation benchmark.

Regression coverage includes fragment links, storage corruption/quota/access denial, edited starters, file ownership/permissions, write ordering, unlink/relink, reset, editor switching and clearing, import/export, recurrence editing, native dialogs, mobile width, optional-module requests, and literal tooltip rendering.

Browser storage remains a working copy, not a backup. Linked-file writes are asynchronous; a tab closing may interrupt a disk save, while the browser copy is saved synchronously. The UI exposes file save failures. Full real-OS file-picker persistence is covered with API mocks rather than unattended OS picker automation. Existing user-controlled data is not migrated on disk by this delivery.
