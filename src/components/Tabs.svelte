<script context="module">
	export const TABS = {};
</script>

<script>
	import { appStateStore } from '$lib/stores/settings';

	import { setContext, onDestroy } from 'svelte';
	import { writable } from 'svelte/store';

	const tabs = [];
	const panels = [];
	const selectedTab = writable(null);
	const selectedPanel = writable(null);

	setContext(TABS, {
		registerTab: tab => {
			tabs.push(tab);
			selectedTab.update(current => current || tab);
			onDestroy(() => {
				const i = tabs.indexOf(tab);
				tabs.splice(i, 1);
				selectedTab.update(current => current === tab ? (tabs[i] || tabs[tabs.length - 1]) : current);
			});
		},

		registerPanel: panel => {
			panels.push(panel);
			selectedPanel.update(current => current || panel);
			
			onDestroy(() => {
				const i = panels.indexOf(panel);
				panels.splice(i, 1);
				selectedPanel.update(current => current === panel ? (panels[i] || panels[panels.length - 1]) : current);
			});
		},

		selectTab: (tab, tabText) => {
			const i = tabs.indexOf(tab);
			selectedTab.set(tab);
			if (panels[i].showLoader) {
				$appStateStore.showLoader = true;
			}
			window.location = `#${tabText}`;
			setTimeout(() => {
				selectedPanel.set(panels[i]);
			}, 300);
		},

		selectedTab,
		selectedPanel
	});
</script>

<div class="tabs">
	<slot></slot>
</div>

<style lang="scss">
	.tabs {
		width: 100vw;
		height: 100%;
		max-width: 56em;
		flex-grow: 1;
		display: flex;
    	flex-direction: column;
	}

</style>