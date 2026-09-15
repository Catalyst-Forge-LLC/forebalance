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
	title={id || tabText}
	class:selected={$selectedTab === tab}
	on:click={() => selectTab(tab, tabText)}
>
	<slot></slot>
</button>

<style lang="scss">
	@use '../scss/colors' as *;

	button {
		flex: 1;
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		border-radius: 0;
		margin: 0;
		padding: 0.35rem 0.4rem;
		color: $clr-accent-ink;
		transition: background-color 0.15s, border-color 0.15s;
		font-size: 0.85rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.3rem;
		&.selected {
			color: $clr-accent-ink;
			border-bottom: 3px solid $clr-gold;
			background-color: $clr-accent-soft;
			font-weight: 700;
		}
		&:focus {
			outline: none;
		}
		&:focus-visible {
			outline: 2px solid $clr-accent;
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
