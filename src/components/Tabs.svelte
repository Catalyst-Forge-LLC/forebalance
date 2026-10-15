<script context="module" lang="ts">
  export interface TabItem {
    id: string;
  }
  export interface PanelItem {
    showLoader: boolean;
  }
  export const TABS = {};
  export { TAB_IDS, tabIdFromHash } from '#lib/nav/hashes.ts';
</script>

<script lang="ts">
  import { activeTabId } from '#lib/nav/activeTab.ts';
  import { appStateStore } from '#lib/stores/settings.ts';
  import { tabIdFromHash } from '#lib/nav/hashes.ts';
  import { setContext, onDestroy, onMount } from 'svelte';
  import { writable } from 'svelte/store';

  const tabs: TabItem[] = [];
  const panels: PanelItem[] = [];
  const selectedTab = writable<TabItem | null>(null);
  const selectedPanel = writable<PanelItem | null>(null);
  let currentIndex = -1;

  function applyIndex(i: number, withLoader: boolean) {
    const tab = tabs[i];
    if (!tab) return;
    currentIndex = i;
    selectedTab.set(tab);
    if (tab.id) activeTabId.set(tab.id as import('#lib/nav/hashes.ts').TabId);
    if (withLoader && panels[i]?.showLoader) {
      $appStateStore.showLoader = true;
      setTimeout(() => selectedPanel.set(panels[i]), 200);
    } else {
      selectedPanel.set(panels[i]);
    }
  }

  setContext(TABS, {
    registerTab: (tab: TabItem) => {
      tabs.push(tab);
      selectedTab.update((current) => current || tab);
      onDestroy(() => {
        const i = tabs.indexOf(tab);
        tabs.splice(i, 1);
        selectedTab.update((current) => (current === tab ? tabs[i] || tabs[tabs.length - 1] : current));
      });
    },

    registerPanel: (panel: PanelItem) => {
      panels.push(panel);
      selectedPanel.update((current) => current || panel);

      onDestroy(() => {
        const i = panels.indexOf(panel);
        panels.splice(i, 1);
        selectedPanel.update((current) => (current === panel ? panels[i] || panels[panels.length - 1] : current));
      });
    },

    selectTab: (tab: TabItem, tabText: string) => {
      const i = tabs.indexOf(tab);
      if (i < 0) return;
      applyIndex(i, true);
      if (tabText) {
        history.replaceState(history.state, '', `#${tabText}`);
      }
    },

    selectedTab,
    selectedPanel,
  });

  function syncFromHash(withLoader = true) {
    const wanted = tabIdFromHash();
    if (!wanted) return;
    const i = tabs.findIndex((tab) => tab.id === wanted);
    if (i < 0) return;
    if (i === currentIndex) {
      activeTabId.set(wanted);
      return;
    }
    applyIndex(i, withLoader);
  }

  function onTabKey(event: KeyboardEvent) {
    if (!event.altKey || event.ctrlKey || event.metaKey) return;
    const index = Number(event.key) - 1;
    if (!Number.isInteger(index) || index < 0 || index >= tabs.length) return;
    event.preventDefault();
    applyIndex(index, true);
    const id = tabs[index]?.id;
    if (id) history.replaceState(history.state, '', `#${id}`);
  }

  function onHashChange() {
    syncFromHash(true);
  }

  onMount(() => {
    syncFromHash(false);
    window.addEventListener('hashchange', onHashChange);
    window.addEventListener('keydown', onTabKey);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
      window.removeEventListener('keydown', onTabKey);
    };
  });
</script>

<div class="tabs">
  <slot></slot>
</div>

<style lang="scss">
  .tabs {
    width: 100%;
    min-width: 0;
    height: 100%;
    max-width: 56em;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
</style>
