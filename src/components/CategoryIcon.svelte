<script lang="ts">
  import Icon from './Icon.svelte';
  export let id: string | undefined = undefined;
  export let size = 16;
  const icons = new Map<string, string>([
    ['all', 'entries'],
    ['unfiled', 'folder'],
    ['housing', 'home'],
    ['utilities', 'plug'],
    ['transportation', 'car'],
    ['food', 'utensils'],
    ['subscriptions', 'repeat'],
    ['income', 'income'],
    ['debt', 'ledger'],
    ['other', 'tag'],
    ['entertainment', 'ticket'],
    ['health-medical', 'medical'],
    ['insurance', 'privacy'],
    ['credit-cards', 'card'],
  ]);
</script>

<Icon name={icons.get(id || 'unfiled') ?? 'tag'} {size} />
