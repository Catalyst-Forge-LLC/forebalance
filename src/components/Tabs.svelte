<script context="module">
	export const TABS = {};
	export { TAB_IDS, tabIdFromHash } from '$lib/nav/hashes';
</script>

<script>
	import { appStateStore } from '$lib/stores/settings';
	import { tabIdFromHash } from '$lib/nav/hashes';
	import { setContext, onDestroy, onMount } from 'svelte';
	import { writable } from 'svelte/store';

	const tabs = [];
	const panels = [];
	const selectedTab = writable(null);
	const selectedPanel = writable(null);

	function applyIndex(i, withLoader) {
		selectedTab.set(tabs[i]);
		if (withLoader && panels[i]?.showLoader) {
			$appStateStore.showLoader = true;
			setTimeout(() => selectedPanel.set(panels[i]), 200);
		} else {
			selectedPanel.set(panels[i]);
		}
	}

	setContext(TABS, {
		registerTab: (tab) => {
			tabs.push(tab);
			selectedTab.update((current) => current || tab);
			onDestroy(() => {
				const i = tabs.indexOf(tab);
				tabs.splice(i, 1);
				selectedTab.update((current) =>
					current === tab ? tabs[i] || tabs[tabs.length - 1] : current,
				);
			});
		},

		registerPanel: (panel) => {
			panels.push(panel);
			selectedPanel.update((current) => current || panel);

			onDestroy(() => {
				const i = panels.indexOf(panel);
				panels.splice(i, 1);
				selectedPanel.update((current) =>
					current === panel ? panels[i] || panels[panels.length - 1] : current,
				);
			});
		},

		selectTab: (tab, tabText) => {
			const i = tabs.indexOf(tab);
			if (i < 0) return;
			applyIndex(i, true);
			if (tabText) {
				history.replaceState(null, '', `#${tabText}`);
			}
		},

		selectedTab,
		selectedPanel,
	});

	function syncFromHash() {
		const wanted = tabIdFromHash();
		if (!wanted) return;
		const i = tabs.findIndex((tab) => tab.id === wanted);
		if (i >= 0) applyIndex(i, false);
	}

	onMount(() => {
		syncFromHash();
		window.addEventListener('hashchange', syncFromHash);
		return () => window.removeEventListener('hashchange', syncFromHash);
	});
</script>

<div class="tabs">
	<slot></slot>
</div>

<style lang="scss">
	.tabs {
		width: 100%;
		min-width: 0;
		height: 100%;
		max-width: 56em;
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}
</style>
