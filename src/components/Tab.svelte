<script>
	import { getContext, onMount } from 'svelte';
	import { TABS } from './Tabs.svelte';

	let button;
	let tabText = '';

	const tab = {};
	const { registerTab, selectTab, selectedTab } = getContext(TABS);

	registerTab(tab);

	onMount(() => {
		tabText = button.innerText.toLowerCase();
		if (window.location.hash.includes(tabText)) {
			selectTab(tab, tabText);
		}
	});
</script>

<style lang="scss">
	button {
		flex: 1;
		background: none;
		border: none;
		border-bottom: 2px solid rgba(0, 0, 0, 0.5);
		border-radius: 0;
		margin: 0;
		padding: 0.25rem 0.5rem;
		color: #050;
		transition: border 0.15s, border-radius 0.15s;
		font-size: 0.85rem;
		&.selected {
			border: none;
			color: #FFF;
			border-bottom: 2px solid #990099;
			border-top-left-radius: 0.5rem;
			border-top-right-radius: 1.5rem;
			background-color: #990099;
			font-weight: 700;
			box-shadow: inset 0 -0.25rem 1rem -0.5rem rgba(0, 0, 0, 0.5), 0 0 0.5rem rgba(0, 0, 0, 0.5);
			border-top: 1px solid rgba(255, 255, 255, 0.85);
			text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
		}
		&:focus {
			outline: none;
		}
	}
	
</style>

<button bind:this={button} class:selected="{$selectedTab === tab}" on:click="{() => selectTab(tab, tabText)}">
	<slot></slot>
</button>