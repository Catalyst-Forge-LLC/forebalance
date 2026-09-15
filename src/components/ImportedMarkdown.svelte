<script>
    import { onMount } from 'svelte';
    import { dev } from '$app/environment';
    import { marked } from 'marked';
    import { githubSlug, tocFromMarkdown } from '$lib/md/toc';

    export let filePath;
    export let toc = [];

    let fileContent = '';
    let html = '';

    marked.use({
        gfm: true,
        breaks: false,
        renderer: {
            heading({ text, tokens, depth }) {
                const inner = this.parser.parseInline(tokens);
                return `<h${depth} id="${githubSlug(text)}">${inner}</h${depth}>\n`;
            },
        },
    });

    $: html = fileContent ? marked.parse(fileContent, { async: false }) : '';
    $: toc = tocFromMarkdown(fileContent);

    onMount(async () => {
        if (filePath) {
            const loadPath = dev ? filePath : filePath.replace('./../../static/', '/');
            const response = await fetch(loadPath);
            fileContent = await response.text();
        }
    });
</script>

<div class="file-content">{@html html}</div>

<style lang="scss">
    .file-content {
        font-size: 1rem;
        line-height: 1.5;
        padding: 0.25rem 0.25rem 2rem;
        text-align: left;
        color: #222;

        :global(h1) {
            font-size: 1.45rem;
            margin: 0 0 0.6rem;
            color: #006600;
            scroll-margin-top: 0.75rem;
        }

        :global(h2) {
            font-size: 1.15rem;
            margin: 1.5rem 0 0.5rem;
            padding-bottom: 0.2rem;
            border-bottom: 1px solid #cce8cc;
            color: #006600;
            scroll-margin-top: 0.75rem;
        }

        :global(h3) {
            font-size: 1rem;
            margin: 1.1rem 0 0.4rem;
            color: #004400;
            scroll-margin-top: 0.75rem;
        }

        :global(p),
        :global(ul),
        :global(ol) {
            margin: 0 0 0.75rem;
            padding: 0;
        }

        :global(ul),
        :global(ol) {
            padding-left: 1.35rem;
        }

        :global(li) {
            margin: 0.25rem 0;
        }

        :global(a) {
            color: #006600;
        }

        :global(code) {
            font-size: 0.88em;
            padding: 0.1em 0.3em;
            background: #eef6ee;
            border-radius: 0.25rem;
        }

        :global(pre) {
            margin: 0 0 0.9rem;
            padding: 0.65rem 0.75rem;
            overflow-x: auto;
            background: #143314;
            color: #e8ffe8;
            border-radius: 0.4rem;
            border-left: 3px solid #c4a35a;
        }

        :global(pre code) {
            padding: 0;
            background: none;
            color: inherit;
            font-size: 0.85rem;
        }

        :global(table) {
            width: 100%;
            margin: 0 0 1rem;
            border-collapse: collapse;
            font-size: 0.92rem;
        }

        :global(th),
        :global(td) {
            padding: 0.4rem 0.55rem;
            border: 1px solid #cce8cc;
            text-align: left;
            vertical-align: top;
        }

        :global(th) {
            background: #e8f5e8;
            color: #004400;
        }

        :global(tr:nth-child(even) td) {
            background: #f8fff8;
        }
    }
</style>
