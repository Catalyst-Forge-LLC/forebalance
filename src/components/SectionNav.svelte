<script lang="ts">
	import { page } from '$app/stores';
	import { activeTabId } from '$lib/nav/activeTab';
	import { TAB_IDS, type TabId } from '$lib/nav/hashes';
	import Icon from './Icon.svelte';

	const labels: Record<TabId, string> = {
		welcome: 'Welcome',
		entries: 'Entries',
		forecast: 'Forecast',
		settings: 'Settings',
		labs: 'Labs',
		help: 'Help',
	};

	function hrefFor(id: TabId): string {
		return $page.url.pathname === '/' ? `#${id}` : `/#${id}`;
	}

	function onClick(event: MouseEvent, id: TabId) {
		if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		if ($page.url.pathname !== '/') return;
		event.preventDefault();
		const next = `#${id}`;
		if (location.hash !== next) history.replaceState(null, '', next);
		window.dispatchEvent(new HashChangeEvent('hashchange'));
	}
</script>

<nav class="sections" aria-label="Sections">
	{#each TAB_IDS as id}
		<a
			href={hrefFor(id)}
			aria-current={$activeTabId === id ? 'page' : undefined}
			on:click={(event) => onClick(event, id)}
		>
			<Icon name={id} />
			<span>{labels[id]}</span>
		</a>
	{/each}
</nav>

<style lang="scss">
	@use '../scss/colors' as *;

	.sections {
		display: none;
	}

	@media (min-width: 62em) {
		.sections {
			display: flex;
			flex: 1 1 auto;
			align-items: center;
			justify-content: space-evenly;
			gap: 0.2rem;
			min-width: 0;
			margin-left: 0.5rem;
		}

		a {
			display: inline-flex;
			align-items: center;
			gap: 0.3rem;
			margin: 0;
			padding: 0.32rem 0.6rem;
			border-radius: 0.4rem;
			color: $clr-accent-ink;
			font-size: 0.85rem;
			line-height: 1.2;
			text-decoration: none;
			white-space: nowrap;
		}

		a:hover {
			background: rgba(232, 242, 232, 0.7);
		}

		a[aria-current='page'] {
			background: $clr-accent-soft;
			box-shadow: inset 0 -2px 0 $clr-gold;
			font-weight: 700;
		}

		a:focus {
			outline: none;
		}

		a:focus-visible {
			outline: 2px solid $clr-accent;
			outline-offset: 2px;
		}
	}
</style>
