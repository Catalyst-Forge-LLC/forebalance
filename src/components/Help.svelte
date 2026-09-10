<script>
    import ImportedMarkdown from './ImportedMarkdown.svelte';
</script>

<article class="help-page">
    <ImportedMarkdown filePath="/md/help.md" />
</article>

<style lang="scss">
    .help-page {
        max-width: 55em;
        margin: 0 auto;
        padding: 0.75rem 1rem 2rem;
        text-align: left;
    }
</style>
