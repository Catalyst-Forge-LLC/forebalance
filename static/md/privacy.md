# Privacy

**Nothing you enter is stored on a server.** Entries, settings, and forecasts live only in *this* browser, on *this* device. We do not want that data, we do not need it, and we will not add a mode that collects it.

That is a product decision, not a toggle. ForeBalance is a static website. There is no account system, no backend database, and no plan to add one.

## What that means

- Entries stay in this browser unless you explicitly export them or share a scenario link.
- ForeBalance has no accounts, sign-ins, ads, or tracking cookies.
- Clearing this site’s data in the browser deletes your scenarios. Browser storage is not a durable backup. Export a saved file (`.psv`) from Entries, or every scenario from the Reset dialog on Settings, if you want a copy you keep.
- A linked file, when your browser supports it, is also only on your disk.

The files that make up this site are hosted like any other static page. They do not receive your forecast.

## Sharing a scenario

A scenario link contains the full entry text. Anyone with the link can read it, so share only what you intend to disclose. New links put the text after `#` (the URL fragment), which browsers do not send in the HTTP request to the host. Links are not encrypted and may be retained by browser history, clipboard tools, or the service where you send them.

Older links used a `?share=` query. Opening those links sends that query to the hosting server before the app can remove it. The app still accepts them for compatibility, but generates only fragment links now. Replace older shared links with new ones.

## Save failures and linked files

If browser storage is full or unavailable, ForeBalance keeps edits in memory and shows a warning. Export a copy before closing the tab. A linked file belongs to the scenario selected when you confirm the link; editing a different scenario does not write to that file. Reopening ForeBalance restores the link without replacing browser entries with disk contents. Relink explicitly to import the file again. Older links without a recorded scenario owner must be linked again.

## Hosting

The site is served by Cloudflare Pages. Cloudflare may inject a performance beacon (`beacon.min.js`) that reports page-load timings, Core Web Vitals, a stripped page URL (path only — no hash, no query), and a coarse browser/OS hint.

That script does **not** read your entries, local storage, linked files, or the forecast table. Hash tabs like `#forecast` are stripped before the URL is sent. We did not add the beacon, and it is not in this project.

Cloudflare’s dashboard can show aggregate visits and performance. It cannot show what you entered.

## Labs

Labs is optional. If you load a model, it runs in this browser.

- **Chrome** may use Gemini Nano, which Chrome already stores on the device.
- **Brave / Edge** (WebGPU) may download Qwen3 1.7B weights from Hugging Face into this origin’s cache. That is a model download, not your entries.

Prompts, entries, and forecasts stay in the tab. We do not receive them.

## What we will not do

We will not add our own telemetry “just to see how people use it.” We will not add cloud sync, accounts, or a server-side save. If those ever appeared, it would no longer be ForeBalance.

Questions about the project, the MIT license, and the disclaimer belong on **[About](/#about)**. How to write an entry is on **[Help](/#help)**.
