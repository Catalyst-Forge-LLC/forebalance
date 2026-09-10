<svelte:head>
	<title>About — ForeBalance</title>
</svelte:head>

<article class="about">
	<h1>About ForeBalance</h1>

	<p>
		ForeBalance is a free browser tool that answers one question: <strong>what will my balance be, and when does it get uncomfortable?</strong>
	</p>

	<p>
		You describe your cashflow as plain text — one line per credit, debit, or balance reset — using a compact pipe-separated format (<code>.psv</code>). ForeBalance expands recurring entries, runs a running balance forward up to 24 months, and highlights rows against your goal, uncomfortable, and low thresholds.
	</p>

	<h2>Privacy</h2>
	<p>
		Nothing you enter is sent to a server. Entries and settings live in your browser's local storage only. There are no accounts, ads, analytics, or tracking. Clear your browser cache and the data is gone — use <strong>Export</strong> on the Entries tab (or a linked <code>.psv</code> file) to keep a copy of the current set, or export every set from the Reset dialog on Settings.
	</p>

	<h2>How to use it</h2>
	<ol>
		<li><strong>Entries</strong> — edit the text list or drop a <code>.psv</code> file.</li>
		<li><strong>Forecast</strong> — scan the chronological ledger; colored rows mark threshold crossings. Switch sets from this tab as well.</li>
		<li><strong>Settings</strong> — set forecast horizon and balance thresholds.</li>
		<li><strong>Help</strong> — full syntax reference for recurrence, accounts, and debt lines.</li>
	</ol>

	<h2>Multi-account &amp; debt</h2>
	<p>
		The entry format supports a main checking account plus linked debt accounts with interest and remaining-balance tracking. The Forecast picker lists each account by name, remaining balance, and APR.
	</p>

	<h2>About the project</h2>
	<p>
		ForeBalance is maintained by <a href="https://github.com/Catalyst-Forge-LLC">Catalyst Forge, LLC</a> as a useful free tool — no paywall, no productization. Domain: <a href="https://forebalance.app">forebalance.app</a>.
	</p>

	<p><a href="/">← Back to ForeBalance</a></p>
</article>

<style lang="scss">
	.about {
		text-align: left;
		max-width: 40em;
		margin: 0 auto;
		padding: 0 1rem 2rem;

		h1 {
			margin-top: 0;
		}

		h2 {
			margin-top: 1.5rem;
			font-size: 1.15rem;
		}

		ol {
			padding-left: 1.25rem;
		}

		a {
			color: #006600;
		}
	}
</style>
