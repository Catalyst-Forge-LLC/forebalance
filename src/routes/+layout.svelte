<script>
	import Header from "../components/Header.svelte";
	import SiteDocModal from "../components/SiteDocModal.svelte";
	import '../app.scss';
</script>

<style lang="scss">
	main {
		flex-grow: 1;
		min-height: 0;
		box-sizing: border-box;
		max-width: var(--fb-body-max);
		width: 100%;
		min-width: 0;
		padding: 0;
		margin: 0 auto;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		position: relative;
		background: linear-gradient(180deg, #ffffff 0%, #fbfcfb 100%);
		border-left: 1px solid #d5d9d3;
		border-right: 1px solid #d5d9d3;
		box-shadow: var(--fb-shadow-page);
	}

	:global(p) {
		text-align: left;
	}

	:global(code, pre) {
		font-family: menlo, inconsolata, monospace;
		font-size: calc(1rem);
		color: #555;
		background-color: #f0f0f0;
		padding: 0.2rem 0.4rem;
		border-radius: 2px;
	}

</style>

<Header></Header>

<main>
	<slot></slot>
</main>

<SiteDocModal />
