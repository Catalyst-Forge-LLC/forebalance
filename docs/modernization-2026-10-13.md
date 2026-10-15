# ForeBalance modernization — 2026-10-13

This delivery keeps ForeBalance a static, browser-local PSV forecaster. It addresses data safety before tooling, dependencies, and measured performance. No deployment is included.

## Commit packaging — 2026-10-14

The implementation is committed locally in separate batches: `2ebfa67` (data safety, tooling, and performance), `ced8b17` (SvelteKit 3), `401a83f` (Welcome design), and `b64d6f0` (shared tab layouts and section navigation). This record and the README stack update form the final documentation batch. Earlier references to uncommitted work describe the verification state at that time. No push or deployment was performed. Packaging used the saved checkpoint to separate overlapping changes without replacing working files; the existing verification evidence above/below applies to the same implementation.

## Follow-up: SvelteKit 3 migration

The previously deferred migration is now implemented with SvelteKit 3.0.1, adapter-static 4.0.0, and TypeScript 6.0.3. Svelte 5.57.2, Vite 8.3.4, and plugin 7.3.1 remain compatible. The earlier dependency list below records the first delivery.

- Configuration now lives in `vite.config.js`; the obsolete `svelte.config.js` is removed. Preprocessing, prerender settings, LocalSlip port selection, and static output are preserved.
- Library imports and test mocks use explicit-extension `#lib` subpath imports. TypeScript extends `$app/tsconfig`, with explicit source, browser-test, and root configuration coverage. Environment imports use `$app/env`.
- Section navigation uses `$app/state` with a reactive pathname. Tab and document-dialog history replacements preserve the router's existing state. Existing Svelte stores and component syntax remain supported.
- Interval version polling is explicitly disabled. Kit 3 still checks version metadata on focus/visibility events; this does not send scenario contents. No application-level forced reload was added.
- Browser coverage now includes direct document routes and refreshes, reactive section links, back/forward navigation, document dismissal with drafts, repeated tab selection, and legacy query-link consumption.
- No storage schema or scenario data conversion is involved. Static hosting and output directory remain unchanged.

Migration verification: all 196 unit tests pass. All 36 browser checks pass (33 in the full run, then the three corrected history-assertion cases rerun successfully across Chromium, Firefox, and WebKit). Formatting/ESLint and the production build pass. Svelte/TypeScript reports zero errors and warnings, frozen-lockfile installation succeeds, and the dependency audit reports zero vulnerabilities. The optional AI bundle still triggers Vite's size advisory; browser tests confirm it remains excluded from initial requests.

Before migration, all tracked and untracked source files were copied to a checkpoint, now retained at `C:\Users\acmegeek\.codex\.chatgpt-projects\g-p-6a6942255d408191a3db9210dba6fe6b\checkpoints\forebalance-before-kit3-20261013-143308`. This includes the earlier uncommitted modernization work. For a local rollback, compare and restore affected files from that checkpoint, restore the old lockfile and Svelte configuration, and reinstall with the frozen lockfile. Do not reset to Git HEAD, which would discard the earlier delivery too.

Release procedure: review the source changes, run the verification commands below, validate a preview deployment, then publish the static `build/` output. If production needs rollback, restore the prior hosting deployment. No hosting changes or publication have been performed by this migration.

## Follow-up: tab layout and navigation

- Entries and Forecast now share the same outer width and padding. Forecast retains its scenario controls, overview, and legend above a keyboard-focusable month scroll region. Account selection uses a compact dropdown that fits mobile widths.
- Settings, Help, and Labs share `SectionWorkspace.svelte`: a persistent desktop section menu, a labelled mobile selector, and an independently scrolling detail region. Settings exposes all six sections; Help displays one topic at a time and preserves heading deep links.
- Labs separates model setup, forecast exploration, entry drafting, and general questions. It exposes model readiness and scenario context, keeps download actions explicit, and moves diagnostic information into disclosures. Actual model download and inference were not exercised during this visual pass.
- The new settings persistence regression uncovered stale initial form values after reload; the draft now follows all loaded settings rather than only thresholds.
- Desktop and mobile renders were inspected. All 45 browser cases are covered by passing runs: 42 passed in the initial full run; all nine new layout/navigation cases passed on rerun after fixing Settings, across Chromium, Firefox, and WebKit. Lint, production build, and typechecking pass with zero Svelte/TypeScript warnings. No deployment was performed.

## Data safety details

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
