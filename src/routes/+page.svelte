<script>
  import { appStateStore, settingsStore, rawEntriesStore } from '../scripts/stores';
  import { Tabs, TabList, TabPanel, Tab } from './../components/tabs';
  import { parseEntries } from '../scripts/parseEntries';

  import ForecastTable from '../components/ForecastTable.svelte';
  import Entries from '../components/Entries.svelte';
  import Settings from '../components/Settings.svelte';
  import Help from '../components/Help.svelte';
  import Welcome from '../components/Welcome.svelte';

  import { initializeData } from '../components/data';
  import { onMount } from 'svelte';
  import { logd } from '../scripts/util';

  let accountEntries = {};
  let accounts;
  let activeAccount = {};

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
    [accountEntries, accounts] = $rawEntriesStore ? parseEntries($rawEntriesStore, $settingsStore.monthsToForecast, balanceFlags) : [{}, {}];
    if (accountEntries && accounts) {
      Object.entries(accounts).forEach(([accountId, account]) => {
        if (account.isMain) {
          activeAccount = account;
        }
      });
      logd('[page-accounts]', { accountEntries, accounts, activeAccount });
    } else {
      activeAccount = {};
    }
  }

  onMount(() => {
    initializeData();
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
        {#if accountEntries[activeAccount.id]}
          <ForecastTable bind:tableEntries={accountEntries[activeAccount.id]}></ForecastTable>
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
</style>
