<script lang="ts">
  export let name: keyof typeof paths;
  export let size = 16;

  const paths: Record<string, string> = {
    welcome:
      'M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01',
    entries: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
    forecast: 'M3 17 9 11l4 4 8-8M13 7h8v8',
    settings:
      'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M2 14h4M10 8h4M18 16h4',
    labs: 'M9 3h6M10 9h4M10 3v6L4.8 18.2A2 2 0 0 0 6.5 21h11a2 2 0 0 0 1.7-2.8L14 9V3',
    help: 'M12 17h.01M9.1 9a3 3 0 1 1 5.8 1c-.7.8-2 1.2-2.9 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18',
    about: 'M12 8h.01M11 12h1v4h1M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18',
    privacy: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    clone: 'M8 8h12v12H8zM4 16V4h12',
    trash: 'M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14',
    import: 'M12 3v12M7 10l5 5 5-5M5 21h14',
    export: 'M12 21V9M7 14l5-5 5 5M5 3h14',
    link: 'M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.2M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.2',
    plus: 'M12 5v14M5 12h14',
    alert: 'M12 9v4M12 17h.01M10.3 4.3 1.8 19a2 2 0 0 0 1.7 3h16.9a2 2 0 0 0 1.8-3L13.7 4.3a2 2 0 0 0-3.4 0z',
    check: 'M20 6 9 17l-5-5',
    download: 'M12 3v12M7 11l5 5 5-5M5 21h14',
    calendar: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  };
</script>

<svg
  class="icon"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  <path d={paths[name]} />
</svg>

<style>
  .icon {
    display: inline-block;
    flex-shrink: 0;
    vertical-align: -0.15em;
  }
</style>
