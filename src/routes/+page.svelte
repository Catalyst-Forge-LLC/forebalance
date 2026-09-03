<script lang="ts">
	import { appStateStore, settingsStore, rawEntriesStore } from '$lib/stores/settings';
	import { Tabs, TabList, TabPanel, Tab } from './../components/tabs';
	import { parseEntries } from '$lib/parser/parseEntries';

	import ForecastTable from '../components/ForecastTable.svelte';
	import ForecastSummary from '../components/ForecastSummary.svelte';
	import Entries from '../components/Entries.svelte';
	import Settings from '../components/Settings.svelte';
	import Help from '../components/Help.svelte';
	import Welcome from '../components/Welcome.svelte';

	import { initializeData } from '$lib/data/initializeData';
	import { onMount } from 'svelte';
	import { logd } from '$lib/util/log';

  let accountEntries = {};
  let accounts;
  let selectedAccountId = '';

  $: balanceFlags = {
    below: {
      negative: 0,
      low: $settingsStore.thresholdLowBalance,
      uncomfortable: $settingsStore.thresholdUncomfortableBalance,
    },
    above: {
      goal: $settingsStore.thresholdGoalBalance,
    },
  };

  $: if ($rawEntriesStore && $settingsStore.monthsToForecast && balanceFlags) {
    [accountEntries, accounts] = $rawEntriesStore
      ? parseEntries($rawEntriesStore, $settingsStore.monthsToForecast, balanceFlags)
      : [null, null];
    if (accountEntries && accounts) {
      const main = Object.values(accounts).find((account) => account.isMain);
      if (main && (!selectedAccountId || !accounts[selectedAccountId])) {
        selectedAccountId = main.id;
      }
      logd('[page-accounts]', { accountEntries, accounts, selectedAccountId });
    } else {
      selectedAccountId = '';
    }
  }

  $: accountList = accounts ? Object.values(accounts).filter((a) => accountEntries?.[a.id]?.length) : [];
  $: selectedEntries = accountEntries && selectedAccountId ? accountEntries[selectedAccountId] : [];
  $: selectedIsMain = accounts?.[selectedAccountId]?.isMain ?? true;

  function scrollToForecastRow(rowIndex: number) {
    document.getElementById(`forecast-row-${rowIndex}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  onMount(() => {
    void initializeData();
  });
</script>

<div class="content">
  <Tabs>
    <TabList>
      <Tab>Welcome</Tab>
      <Tab>Entries</Tab>
      <Tab>Forecast</Tab>
      <Tab>Settings</Tab>
      <Tab>Help</Tab>
    </TabList>
    <div class="tab-panel">
      <div class="loader" class:loaded={!$appStateStore.showLoader}>Calculating your forecast...</div>
      <TabPanel>
        <Welcome></Welcome>
      </TabPanel>
      <TabPanel>
        <Entries></Entries>
      </TabPanel>
      <TabPanel showLoader="true">
        {#if accountEntries && selectedAccountId && accountEntries[selectedAccountId]}
          {#if accountList.length > 1}
            <div class="account-picker">
              {#each accountList as account}
                <button
                  type="button"
                  class:selected={selectedAccountId === account.id}
                  on:click={() => (selectedAccountId = account.id)}
                >
                  {account.id}{account.isMain ? ' (main)' : ''}
                </button>
              {/each}
            </div>
          {/if}
          <ForecastSummary
            entries={selectedEntries}
            {balanceFlags}
            useMainBalance={selectedIsMain}
            onScrollToRow={scrollToForecastRow}
          />
          <ForecastTable
            bind:tableEntries={accountEntries[selectedAccountId]}
            {accounts}
          ></ForecastTable>
        {/if}
      </TabPanel>
      <TabPanel>
        <Settings></Settings>
      </TabPanel>
      <TabPanel>
        <Help></Help>
      </TabPanel>
    </div>
  </Tabs>
  {#if false}<slot></slot>{/if}
  <br style="clear: both;" />
</div>

<style lang="scss">
  .content {
    text-align: center;
    padding: 0;
    display: flex;
    align-items: flex-start;
    flex-wrap: wrap;
    height: 100%;
  }

  .loader {
    position: absolute;
    padding-top: 10vh;
    width: 100%;
    height: 100%;
    font-weight: 700;
    font-size: 3rem;
    text-align: center;
    background-color: #fff;
    opacity: 1;
    z-index: 9999;
    transition:
      opacity 0.25s ease-in-out,
      visibility 0.25s ease-in-out;
    visibility: visible;
    &.loaded {
      opacity: 0;
      visibility: hidden;
    }
  }

  .tab-panel {
    flex-grow: 1;
    overflow: overlay;
    position: relative;
    padding-bottom: 4rem;
  }

  .account-picker {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: center;
    margin: 0.5rem 0 1rem;
    padding: 0 0.5rem;

    button {
      background: #e8f5e8;
      border: 1px solid #009900;
      border-radius: 0.5rem;
      color: #004400;
      cursor: pointer;
      font-size: 0.85rem;
      padding: 0.35rem 0.75rem;

      &.selected {
        background: #009900;
        color: #fff;
        font-weight: 700;
      }
    }
  }
</style>
