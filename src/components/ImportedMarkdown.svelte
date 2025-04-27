<script>
    import { onMount } from 'svelte';
    import { dev } from '$app/environment';
    import { marked } from 'marked';
    
    export let filePath;

    let fileContent = '';

    onMount(async () => {
        if (filePath) {
            const loadPath = dev ? filePath : filePath.replace('./../../static/', '/');
            fetch(loadPath)
                .then(response => response.text())
                .then(data => {
                    fileContent = data;
                });

        }
    });
</script>

<div class="file-content">{@html marked(fileContent)}</div>

<style lang="scss">
    .file-content {
        font-size: 0.85rem;
        padding: 0.5rem;
        text-align: left;
    }
</style>
