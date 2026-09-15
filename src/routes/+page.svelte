<script lang="ts">
	import { appStateStore, settingsStore, rawEntriesStore } from '$lib/stores/settings';
	import { Tabs, TabList, TabPanel, Tab } from './../components/tabs';
	import { parseEntries } from '$lib/parser/parseEntries';
	import { accountDisplayName, formatAccountOption } from '$lib/parser/accountLabel';
	import { fmt } from '$lib/formatters/fmt';

	import ForecastTable from '../components/ForecastTable.svelte';
	import ForecastSummary from '../components/ForecastSummary.svelte';
	import ForecastSparkline from '../components/ForecastSparkline.svelte';
	import Entries from '../components/Entries.svelte';
	import Settings from '../components/Settings.svelte';
	import Help from '../components/Help.svelte';
	import Welcome from '../components/Welcome.svelte';

	import { initializeData } from '$lib/data/initializeData';
	import { downloadTextFile, entrySetsStore, getActiveSet } from '$lib/data/entrySets';
	import {
		forecastAllAccountsToCsv,
		forecastEntriesToCsv,
		forecastFilename,
		forecastSummaryText,
	} from '$lib/forecast/exportCsv';
	import { forecastBlockReason } from '$lib/parser/forecastReady';
	import { onMount } from 'svelte';
	import { logd } from '$lib/util/log';
	import Icon from '../components/Icon.svelte';
	import SetSwitcher from '../components/SetSwitcher.svelte';
	import ForecastMenu from '../components/ForecastMenu.svelte';

  let accountEntries = {};
  let accounts;
  let selectedAccountId = '';
  let parsedOnce = false;

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

  function applyParsed(raw: string | null) {
    [accountEntries, accounts] = raw
      ? parseEntries(raw, $settingsStore.monthsToForecast, balanceFlags, {
          useFederalHolidays: $settingsStore.useFederalHolidays,
          balanceIncludesSameDay: $settingsStore.balanceIncludesSameDay,
        })
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
    parsedOnce = true;
  }

  $: if ($settingsStore.monthsToForecast && balanceFlags) {
    applyParsed($rawEntriesStore || null);
  }

  $: accountList = accounts ? Object.values(accounts).filter((a) => accountEntries?.[a.id]?.length) : [];
  $: selectedEntries = accountEntries && selectedAccountId ? accountEntries[selectedAccountId] : [];
  $: selectedAccount = accounts?.[selectedAccountId];
  $: selectedIsMain = selectedAccount?.isMain ?? true;
  $: forecastReady = !!(accountEntries && selectedAccountId && accountEntries[selectedAccountId]);
  $: forecastReason = forecastReady ? '' : forecastBlockReason($rawEntriesStore);

  function selectedAccountHelp(account: typeof selectedAccount): string {
    if (!account) return '';
    if (account.isMain) {
      return `Showing ${accountDisplayName(account)}. The amount is your checking balance at the end of the forecast.`;
    }
    const name = accountDisplayName(account);
    const started = fmt.curr(account.startingBal);
    const remaining = account.runningBal <= 1 ? 'paid off' : `${fmt.curr(account.runningBal)} remaining`;
    const rate = (account.interestRate ?? 0) > 0 ? ` Interest ${account.interestRate}% is applied monthly.` : '';
    return `${name} started at ${started}; now ${remaining}.${rate}`;
  }

  function scrollToForecastRow(rowIndex: number) {
    document.getElementById(`forecast-row-${rowIndex}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  $: scenarioName = getActiveSet($entrySetsStore)?.name ?? 'scenario';
  $: exportAccountLabel = selectedAccount ? accountDisplayName(selectedAccount) : 'account';

  function exportForecastCsv() {
    if (!forecastReady || !accounts) return;
    downloadTextFile(
      forecastFilename(scenarioName, exportAccountLabel),
      forecastEntriesToCsv(selectedEntries, accounts, selectedIsMain),
      'text/csv',
    );
  }

  async function copyForecastCsv() {
    if (!forecastReady || !accounts) return;
    await navigator.clipboard.writeText(
      forecastEntriesToCsv(selectedEntries, accounts, selectedIsMain),
    );
  }

  function exportAllAccountsCsv() {
    if (!forecastReady || !accounts || !accountEntries) return;
    downloadTextFile(
      forecastFilename(scenarioName, 'all-accounts'),
      forecastAllAccountsToCsv(accountList, accountEntries, accounts),
      'text/csv',
    );
  }

  async function copyForecastSummary() {
    if (!forecastReady) return;
    await navigator.clipboard.writeText(
      forecastSummaryText(selectedEntries, balanceFlags, {
        scenarioName,
        accountLabel: exportAccountLabel,
        useMainBalance: selectedIsMain,
      }),
    );
  }

  onMount(() => {
    void initializeData();
  });
</script>

<div class="content">
  <Tabs>
    <TabList>
      <Tab id="welcome"><Icon name="welcome" /> <span class="tab-label">Welcome</span></Tab>
      <Tab id="entries"><Icon name="entries" /> <span class="tab-label">Entries</span></Tab>
      <Tab id="forecast"><Icon name="forecast" /> <span class="tab-label">Forecast</span></Tab>
      <Tab id="settings"><Icon name="settings" /> <span class="tab-label">Settings</span></Tab>
      <Tab id="labs"><Icon name="labs" /> <span class="tab-label">Labs</span></Tab>
      <Tab id="help"><Icon name="help" /> <span class="tab-label">Help</span></Tab>
    </TabList>
    <div class="tab-panel">
      <div class="loader" class:loaded={!$appStateStore.showLoader}>Calculating your forecast...</div>
      <TabPanel>
        <Welcome
          entries={selectedEntries}
          {balanceFlags}
          useMainBalance={selectedIsMain}
          forecastReady={forecastReady}
        />
      </TabPanel>
      <TabPanel>
        <Entries></Entries>
      </TabPanel>
      <TabPanel showLoader="true">
        <div class="forecast-column">
          <SetSwitcher editable={false}>
            <div slot="extra" class="account-slot">
              {#if forecastReady && accountList.length > 1}
                {#if accountList.length > 4}
                  <label class="account-select">
                    <span class="sr-only">Account</span>
                    <select
                      value={selectedAccountId}
                      title={selectedAccountHelp(selectedAccount)}
                      on:change={(e) => (selectedAccountId = e.currentTarget.value)}
                    >
                      {#each accountList as account}
                        <option value={account.id}>{formatAccountOption(account)}</option>
                      {/each}
                    </select>
                  </label>
                {:else}
                  <div class="account-buttons" title={selectedAccountHelp(selectedAccount)}>
                    {#each accountList as account}
                      <button
                        type="button"
                        class:selected={selectedAccountId === account.id}
                        on:click={() => (selectedAccountId = account.id)}
                      >
                        {formatAccountOption(account)}
                      </button>
                    {/each}
                  </div>
                {/if}
              {/if}
              <ForecastMenu
                ready={forecastReady}
                hasMultipleAccounts={accountList.length > 1}
                onExportCsv={exportForecastCsv}
                onCopyCsv={copyForecastCsv}
                onExportAll={exportAllAccountsCsv}
                onCopySummary={copyForecastSummary}
              />
            </div>
          </SetSwitcher>
          {#if forecastReady}
            <div class="forecast-glance">
              <ForecastSummary
                entries={selectedEntries}
                {balanceFlags}
                useMainBalance={selectedIsMain}
                onScrollToRow={scrollToForecastRow}
              />
              <ForecastSparkline
                entries={selectedEntries}
                {balanceFlags}
                useMainBalance={selectedIsMain}
              />
            </div>
            <ForecastTable
              tableEntries={accountEntries[selectedAccountId]}
              {accounts}
              viewingMainAccount={selectedIsMain}
            ></ForecastTable>
          {:else if parsedOnce}
            <div class="forecast-empty">
              <p>{forecastReason}</p>
              <p class="hint">Edit the text on Entries, or pick another scenario above.</p>
            </div>
          {/if}
        </div>
      </TabPanel>
      <TabPanel>
        <Settings></Settings>
      </TabPanel>
      <TabPanel>
        {#await import('../components/Labs.svelte')}
          <p class="labs-boot">Opening Labs…</p>
        {:then { default: Labs }}
          <Labs
            entries={selectedEntries}
            {balanceFlags}
            useMainBalance={selectedIsMain}
            forecastReady={forecastReady}
          />
        {/await}
      </TabPanel>
      <TabPanel>
        <Help></Help>
      </TabPanel>
    </div>
  </Tabs>
  {#if false}<slot></slot>{/if}
</div>

<style lang="scss">
  .content {
    text-align: center;
    padding: 0;
    display: flex;
    align-items: stretch;
    flex-direction: column;
    flex: 1;
    min-height: 0;
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
    flex: 1;
    min-height: 0;
    overflow: auto;
    position: relative;
    display: flex;
    flex-direction: column;
    padding-bottom: 0.75rem;
  }

  .labs-boot {
    margin: 1.5rem 0;
    width: 100%;
    box-sizing: border-box;
    padding: 0 1rem;
    text-align: left;
    color: #5c635c;
  }

  .forecast-empty {
    max-width: 36em;
    margin: 1.5rem auto;
    padding: 1rem 1.25rem;
    text-align: left;
    background: #fff8e6;
    border: 1px solid #cc8800;
    border-radius: 0.4rem;

    p {
      margin: 0;
      padding: 0;
    }

    .hint {
      margin-top: 0.5rem;
      font-size: 0.9rem;
      color: #555;
    }
  }

  .forecast-column {
    box-sizing: border-box;
    width: calc(100% - 2rem);
    max-width: 64em;
    margin: 0.35rem auto 0;

    :global(.bar.compact) {
      box-sizing: border-box;
      width: 100%;
      max-width: none;
      margin: 0 0 0.35rem;
    }

    :global(.table-wrap) {
      width: 100%;
      margin-left: 0;
      margin-right: 0;
    }
  }

  .account-slot {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem;
    margin-left: auto;
  }

  .account-select select {
    font-size: 0.85rem;
    padding: 0.25rem 0.4rem;
    border: 1px solid #d5d9d3;
    border-radius: 0.35rem;
    max-width: 18em;
  }

  .account-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .account-buttons button {
    background: #fff;
    border: 1px solid #d5d9d3;
    border-radius: 0.35rem;
    color: #0d5c14;
    cursor: pointer;
    font-size: 0.75rem;
    padding: 0.2rem 0.5rem;

    &.selected {
      background: #e8f2e8;
      border-color: #009900;
      color: #0d5c14;
      font-weight: 700;
    }
  }

  .forecast-glance {
    box-sizing: border-box;
    width: 100%;
    margin: 0 0 0.5rem;
    padding: 0.4rem 0.6rem 0.45rem;
    display: grid;
    grid-template-columns: minmax(14em, 1fr) minmax(16em, 1.15fr);
    gap: 0.5rem 1.25rem;
    align-items: center;
    text-align: left;
    background: #fff;
    border: 1px solid #d5d9d3;
    border-radius: 0.4rem;
  }

  @media (max-width: 40em) {
    .forecast-glance {
      grid-template-columns: 1fr;
    }

    .account-slot {
      margin-left: 0;
      width: 100%;
    }
  }

  .tab-label {
    white-space: nowrap;
  }

  @media (max-width: 44em) {
    .tab-label {
      display: none;
    }
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    border: 0;
  }
</style>
