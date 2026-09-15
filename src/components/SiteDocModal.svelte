<script lang="ts">
	import { onMount } from 'svelte';
	import About from './About.svelte';
	import Privacy from './Privacy.svelte';
	import { docIdFromHash, idFromHash, tabIdFromHash, type DocId } from '$lib/nav/hashes';

	let doc: DocId | null = null;
	let returnHash = '#welcome';
	let dialog: HTMLDialogElement;

	function rememberTabHash(hash = typeof location !== 'undefined' ? location.hash : '') {
		if (tabIdFromHash(hash)) {
			returnHash = hash && idFromHash(hash) ? hash : '#welcome';
		}
	}

	function sync() {
		const next = docIdFromHash();
		if (next) {
			doc = next;
			return;
		}
		rememberTabHash();
		doc = null;
	}

	function dismiss() {
		const dest = returnHash || '#welcome';
		if (docIdFromHash()) {
			history.replaceState(null, '', dest);
		}
		doc = null;
	}

	function onBackdrop(e: MouseEvent) {
		if (e.target === dialog) dismiss();
	}

	function show(node: HTMLDialogElement) {
		node.showModal();
		return {
			destroy() {
				if (node.open) node.close();
			},
		};
	}

	onMount(() => {
		rememberTabHash();
		sync();
		window.addEventListener('hashchange', sync);
		return () => window.removeEventListener('hashchange', sync);
	});
</script>

{#if doc}
	<dialog
		bind:this={dialog}
		class="doc-dialog"
		use:show
		aria-labelledby="site-doc-title"
		on:close={dismiss}
		on:cancel={dismiss}
		on:click={onBackdrop}
	>
		<header class="doc-head">
			<h2 id="site-doc-title">{doc === 'about' ? 'About' : 'Privacy'}</h2>
			<button type="button" class="close" on:click={dismiss}>Close</button>
		</header>
		<div class="doc-body">
			{#if doc === 'about'}
				<About />
			{:else}
				<Privacy />
			{/if}
		</div>
	</dialog>
{/if}

<style lang="scss">
	@use '../scss/colors' as *;

	dialog {
		width: min(52em, calc(100vw - 1.5rem));
		max-height: min(88vh, 52rem);
		margin: auto;
		padding: 0;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		border: 2px solid $clr-accent;
		border-radius: 0.6rem;
		background: linear-gradient(180deg, #ffffff 0%, #fbfcfb 100%);
		box-shadow: 0 0.6rem 2rem rgba(28, 33, 28, 0.18);
		color: $clr-text;
	}

	dialog::backdrop {
		background: rgba(28, 33, 28, 0.42);
	}

	.doc-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.7rem 0.9rem;
		background: linear-gradient(180deg, #ffffff 0%, #f3f8f2 100%);
		border-bottom: 2px solid $clr-gold;
	}

	h2 {
		margin: 0;
		font-size: 1.15rem;
		color: $clr-accent-ink;
	}

	.close {
		margin: 0;
		padding: 0.25rem 0.7rem;
		font-size: 0.85rem;
		font-weight: 700;
		color: $clr-accent-ink;
		background: $clr-accent-soft;
		border: 1px solid $clr-border-strong;
		border-radius: 0.35rem;
		cursor: pointer;
	}

	.doc-body {
		flex: 1;
		min-height: 0;
		overflow: auto;
		padding: 0.5rem 0.25rem 1rem;
		text-align: left;
	}

	.doc-body :global(.doc-page) {
		max-width: none;
		margin: 0;
		padding: 0.25rem 1rem 0.5rem;
	}
</style>
