<script>
  import About from '../../components/About.svelte';
</script>

<svelte:head>
  <title>About — ForeBalance</title>
</svelte:head>

<About />
<p class="back"><a href="/">← Back to ForeBalance</a></p>

<style>
  .back {
    max-width: 55em;
    margin: 0 auto 2rem;
    padding: 0 1rem;
  }
  .back a {
    color: #006600;
  }
</style>
