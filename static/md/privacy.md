# Privacy

**Nothing you enter is stored on a server.** Entries, settings, and forecasts live only in *this* browser, on *this* device. We do not want that data, we do not need it, and we will not add a mode that collects it.

That is a product decision, not a toggle. ForeBalance is a static website. There is no account system, no backend database, and no plan to add one.

## What that means

- Anything you type — your entries, balances, accounts — never leaves the machine you are typing on.
- ForeBalance has no accounts, sign-ins, ads, or tracking cookies.
- Clearing this site’s data in the browser deletes your scenarios. Browser storage is not a durable backup. Export a `.psv` from Entries, or every scenario from the Reset dialog on Settings, if you want a copy you keep.
- A linked file, when your browser supports it, is also only on your disk.

The files that make up this site are hosted like any other static page. They do not receive your forecast.

## Hosting

The site is served by Cloudflare Pages. Cloudflare may inject a performance beacon (`beacon.min.js`) that reports page-load timings, Core Web Vitals, a stripped page URL (path only — no hash, no query), and a coarse browser/OS hint.

That script does **not** read your entries, local storage, linked files, or the forecast table. Hash tabs like `#forecast` are stripped before the URL is sent. We did not add the beacon, and it is not in this project.

Cloudflare’s dashboard can show aggregate visits and performance. It cannot show what you typed.

## Labs

Labs is optional. If you load a model, it runs in this browser.

- **Chrome** may use Gemini Nano, which Chrome already stores on the device.
- **Brave / Edge** (WebGPU) may download Qwen3 1.7B weights from Hugging Face into this origin’s cache. That is a model download, not your entries.

Prompts, entries, and forecasts stay in the tab. We do not receive them.

## What we will not do

We will not add our own telemetry “just to see how people use it.” We will not add cloud sync, accounts, or a server-side save. If those ever appeared, it would no longer be ForeBalance.

Questions about the project, the MIT license, and the disclaimer belong on **[About](/#about)**. How to write entries is on **[Help](/#help)**.
