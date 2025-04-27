<script>
	import Footer from "../components/Footer.svelte";
	import Header from "../components/Header.svelte";
	import '../app.scss';
</script>

<style lang="scss">
	main {
		flex-grow: 1;
		max-width: 56em;
		padding: 0;
		margin: 0 auto;
		overflow: overlay;
		position: relative;
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

<Footer></Footer>