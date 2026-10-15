<script lang="ts">
  import { onMount, tick } from 'svelte';
  import SectionWorkspace from './SectionWorkspace.svelte';
  import ImportedMarkdown from './ImportedMarkdown.svelte';
  import help from '../../static/md/help.md?raw';
  import { tocFromMarkdown } from '#lib/md/toc.ts';

  const sections = help.split(/(?=^## )/m).map((source, index) => {
    const heading = tocFromMarkdown(source)[0];
    return { id: heading.id, label: index === 0 ? 'Getting started' : heading.text, source };
  });
  let active = sections[0].id;
  $: selected = sections.find((section) => section.id === active) ?? sections[0];

  async function followHash() {
    const id = location.hash.slice(1);
    const section = sections.find((item) => tocFromMarkdown(item.source, 1, 6).some((heading) => heading.id === id));
    if (!section) return;
    active = section.id;
    await tick();
    document.getElementById(id)?.scrollIntoView({ block: 'start' });
  }
  onMount(() => {
    void followHash();
    window.addEventListener('hashchange', followHash);
    return () => window.removeEventListener('hashchange', followHash);
  });
</script>

<SectionWorkspace title="Help" description="Choose a topic to learn the entry format and forecast behavior." items={sections} bind:active>
  <ImportedMarkdown source={selected.source} />
</SectionWorkspace>
