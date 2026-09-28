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
			align-items: stretch;
			justify-content: space-evenly;
			gap: 0.15rem;
			min-width: 0;
			margin-left: 0.5rem;
		}

		a {
			position: relative;
			display: inline-flex;
			align-items: center;
			gap: 0.3rem;
			margin: 0.4rem 0 0;
			padding: 0 0.75rem;
			border-radius: 0.45rem 0.45rem 0 0;
			color: $clr-accent-ink;
			font-size: 0.85rem;
			line-height: 1.2;
			text-decoration: none;
			white-space: nowrap;
		}

		a:hover {
			background: rgba(232, 242, 232, 0.65);
		}

		a[aria-current='page'] {
			background: $clr-accent-soft;
			font-weight: 700;
		}

		a[aria-current='page']::after {
			content: '';
			position: absolute;
			left: 0;
			right: 0;
			bottom: -4px;
			height: 4px;
			background: $clr-gold;
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
