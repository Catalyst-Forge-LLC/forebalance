<script>
	import { onDestroy, tick } from 'svelte';
	import ImportedMarkdown from './ImportedMarkdown.svelte';

	let toc = [];
	let activeId = '';
	/** @type {IntersectionObserver | undefined} */
	let observer;

	$: if (toc.length) {
		void watchHeadings(toc);
	}

	async function watchHeadings(items) {
		await tick();
		observer?.disconnect();
		const root = document.querySelector('.tab-panel');
		if (!root || typeof IntersectionObserver === 'undefined') return;
		observer = new IntersectionObserver(
			(entries) => {
				const visible = entries
					.filter((entry) => entry.isIntersecting)
					.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
				if (visible[0]?.target.id) activeId = visible[0].target.id;
			},
			{ root, rootMargin: '0px 0px -70% 0px', threshold: 0 },
		);
		for (const item of items) {
			const heading = document.getElementById(item.id);
			if (heading) observer.observe(heading);
		}
		if (!activeId && items[0]) activeId = items[0].id;
	}

	function jump(event, id) {
		event.preventDefault();
		document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		activeId = id;
	}

	onDestroy(() => observer?.disconnect());
</script>

<article class="help-page">
	{#if toc.length}
		<nav class="help-nav" aria-label="Help contents">
			<p class="nav-label">Contents</p>
			<ul>
				{#each toc as item}
					<li>
						<a
							href="#{item.id}"
							class:active={activeId === item.id}
							on:click={(event) => jump(event, item.id)}
						>
							{item.level === 1 ? 'Start' : item.text}
						</a>
					</li>
				{/each}
			</ul>
		</nav>
	{/if}
	<div class="help-body">
		<ImportedMarkdown filePath="/md/help.md" bind:toc />
	</div>
</article>

<style lang="scss">
	@use '../scss/colors' as *;

	.help-page {
		display: grid;
		grid-template-columns: 11.5em minmax(0, 1fr);
		gap: 1.25rem 1.5rem;
		width: 100%;
		box-sizing: border-box;
		margin: 0;
		padding: 0.75rem 1rem 2rem;
		text-align: left;
	}

	.help-nav {
		position: sticky;
		top: 0.5rem;
		align-self: start;
		padding: 0.45rem 0.55rem;
		background: linear-gradient(180deg, #ffffff 0%, #f7faf6 100%);
		border: 1px solid $clr-border;
		border-radius: 0.4rem;
		box-shadow: var(--fb-shadow-card);
	}

	.nav-label {
		margin: 0 0 0.35rem;
		padding: 0;
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: $clr-muted;
	}

	ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	li + li {
		margin-top: 0.1rem;
	}

	a {
		display: block;
		padding: 0.22rem 0.35rem;
		border-radius: 0.25rem;
		color: $clr-accent-ink;
		font-size: 0.8rem;
		line-height: 1.3;
		text-decoration: none;
	}

	a:hover {
		background: $clr-accent-soft;
	}

	a.active {
		background: $clr-accent-soft;
		font-weight: 700;
		box-shadow: inset 2px 0 0 $clr-accent;
	}

	@media (max-width: 40em) {
		.help-page {
			grid-template-columns: 1fr;
			gap: 0.65rem;
		}

		.help-nav {
			position: sticky;
			top: 0;
			z-index: 2;
			padding: 0.4rem 0.5rem 0.45rem;
		}

		ul {
			display: flex;
			flex-wrap: wrap;
			gap: 0.15rem 0.15rem;
		}

		li + li {
			margin-top: 0;
		}
	}
</style>
