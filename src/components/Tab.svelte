<script>
	import { getContext, onMount } from 'svelte';
	import { TABS } from './Tabs.svelte';

	export let id = '';

	let button;
	let tabText = id;

	const tab = { id };
	const { registerTab, selectTab, selectedTab } = getContext(TABS);

	registerTab(tab);

	onMount(() => {
		tabText = id || button.innerText.toLowerCase().trim();
		tab.id = tabText;
	});
</script>

<button
	bind:this={button}
	type="button"
	class:selected={$selectedTab === tab}
	on:click={() => selectTab(tab, tabText)}
>
	<slot></slot>
</button>

<style lang="scss">
	button {
		flex: 1;
		background: none;
		border: none;
		border-bottom: 2px solid rgba(0, 0, 0, 0.5);
		border-radius: 0;
		margin: 0;
		padding: 0.25rem 0.4rem;
		color: #050;
		transition: border 0.15s, border-radius 0.15s;
		font-size: 0.85rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.3rem;
		&.selected {
			border: none;
			color: #fff;
			border-bottom: 2px solid #990099;
			border-top-left-radius: 0.5rem;
			border-top-right-radius: 1.5rem;
			background-color: #990099;
			font-weight: 700;
			box-shadow:
				inset 0 -0.25rem 1rem -0.5rem rgba(0, 0, 0, 0.5),
				0 0 0.5rem rgba(0, 0, 0, 0.5);
			border-top: 1px solid rgba(255, 255, 255, 0.85);
			text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
		}
		&:focus {
			outline: none;
		}
		&:focus-visible {
			outline: 2px solid #009900;
			outline-offset: 2px;
		}
	}

	@media (max-width: 36em) {
		button {
			font-size: 0.75rem;
			padding: 0.25rem 0.2rem;
		}
	}
</style>
