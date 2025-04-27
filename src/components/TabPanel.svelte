<script>
	import { getContext } from 'svelte';
	import { TABS } from './Tabs.svelte';

	export let showLoader = false;

	const panel = {showLoader};
	const { registerPanel, selectedPanel } = getContext(TABS);


	registerPanel(panel);
</script>

{#if $selectedPanel === panel}
	<slot></slot>
{/if}