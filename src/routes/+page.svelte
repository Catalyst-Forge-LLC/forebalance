<script lang="ts">
  import type { AccountEntries, Accounts } from '#lib/parser/types.ts';
  import { appStateStore, settingsStore, rawEntriesStore } from '#lib/stores/settings.ts';
  import { Tabs, TabList, TabPanel, Tab } from './../components/tabs';
  import { parseEntries } from '#lib/parser/parseEntries.ts';
  import { currencyLabel } from '#lib/data/currencies.ts';
  import { accountDisplayName, formatAccountOption } from '#lib/parser/accountLabel.ts';
  import { fmt } from '#lib/formatters/fmt.ts';

  import ForecastTable from '../components/ForecastTable.svelte';
  import ForecastSummary from '../components/ForecastSummary.svelte';
  import ForecastSparkline from '../components/ForecastSparkline.svelte';
  import Entries from '../components/Entries.svelte';
  import Settings from '../components/Settings.svelte';
  import Help from '../components/Help.svelte';
  import Welcome from '../components/Welcome.svelte';

  import { loadCategories } from '#lib/data/categories.ts';
  import { initializeData } from '#lib/data/initializeData.ts';
  import { downloadTextFile, entrySetsStore, getActiveSet, switchEntrySet } from '#lib/data/entrySets.ts';
  import { shareUrl, takeSharePayload } from '#lib/data/shareLink.ts';
  import { activateEntrySet, setRawEntries } from '#lib/data/entriesPersistence.ts';
  import { compareScenarios } from '#lib/forecast/scenarioCompare.ts';
  import { forecastAllAccountsToCsv, forecastEntriesToCsv, forecastFilename, forecastSummaryText } from '#lib/forecast/exportCsv.ts';
  import { forecastBlockReason } from '#lib/parser/forecastReady.ts';
  import { onMount } from 'svelte';
  import { logd } from '#lib/util/log.ts';
  import Icon from '../components/Icon.svelte';
  import SetSwitcher from '../components/SetSwitcher.svelte';
  import ForecastMenu from '../components/ForecastMenu.svelte';
  import ScenarioCompare from '../components/ScenarioCompare.svelte';

  let accountEntries: AccountEntries | null = null;
  let accounts: Accounts | null = null;
  let selectedAccountId = '';
  let parsedOnce = false;
  /** False until initializeData has read stored scenarios. The empty first parse must not count. */
  let entriesReady = false;

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

  $: if ($settingsStore.monthsToForecast && $settingsStore.currencyIsoCode && $settingsStore.locale && balanceFlags) {
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

  let compareOpen = false;
  let compareId = '';

  $: scenarioName = getActiveSet($entrySetsStore)?.name ?? 'scenario';
  $: otherSets = $entrySetsStore.sets.filter((set) => set.id !== $entrySetsStore.activeId);
  $: if (compareOpen && !otherSets.some((set) => set.id === compareId)) {
    compareId = otherSets[0]?.id ?? '';
  }
  $: compareOther = otherSets.find((set) => set.id === compareId);
  $: compared =
    compareOpen && compareOther
      ? compareScenarios($rawEntriesStore, compareOther.raw, $settingsStore.monthsToForecast, balanceFlags, {
          useFederalHolidays: $settingsStore.useFederalHolidays,
          balanceIncludesSameDay: $settingsStore.balanceIncludesSameDay,
        })
      : null;

  function openCompared() {
    if (!compareId) return;
    const next = switchEntrySet(compareId, $rawEntriesStore);
    if (next) activateEntrySet(next.raw);
    compareOpen = false;
  }
  $: exportAccountLabel = selectedAccount ? accountDisplayName(selectedAccount) : 'account';

  async function copyShareLink() {
    await navigator.clipboard.writeText(shareUrl($rawEntriesStore));
  }

  function exportForecastCsv() {
    if (!forecastReady || !accounts) return;
    downloadTextFile(forecastFilename(scenarioName, exportAccountLabel), forecastEntriesToCsv(selectedEntries, accounts, selectedIsMain), 'text/csv');
  }

  async function copyForecastCsv() {
    if (!forecastReady || !accounts) return;
    await navigator.clipboard.writeText(forecastEntriesToCsv(selectedEntries, accounts, selectedIsMain));
  }

  function exportAllAccountsCsv() {
    if (!forecastReady || !accounts || !accountEntries) return;
    downloadTextFile(forecastFilename(scenarioName, 'all-accounts'), forecastAllAccountsToCsv(accountList, accountEntries, accounts), 'text/csv');
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
    loadCategories();
    void initializeData().finally(() => {
      entriesReady = true;
      const shared = takeSharePayload();
      if (!shared) return;
      if (confirm('Load the shared scenario in this browser? It replaces the current entries on this device only.')) {
        setRawEntries(shared);
      }
    });
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
        <Welcome entries={selectedEntries} {balanceFlags} useMainBalance={selectedIsMain} {forecastReady} scenarioPending={!entriesReady} />
      </TabPanel>
      <TabPanel>
        <Entries></Entries>
      </TabPanel>
      <TabPanel showLoader={true}>
        <div class="forecast-column">
          <SetSwitcher editable={false}>
            <div slot="extra" class="account-slot">
              <a href="#settings" class="currency-mark" title="{currencyLabel($settingsStore.currencyIsoCode)}. Change in Settings.">
                <span class="sr-only">Display currency</span>
                {$settingsStore.currencyIsoCode}
              </a>
              {#if forecastReady && accountList.length > 1}
                <label class="account-select">
                  <span class="sr-only">Account</span>
                  <select value={selectedAccountId} title={selectedAccountHelp(selectedAccount)} on:change={(e) => (selectedAccountId = e.currentTarget.value)}>
                    {#each accountList as account (account)}
                      <option value={account.id}>{formatAccountOption(account)}</option>
                    {/each}
                  </select>
                </label>
              {/if}
              <ForecastMenu
                ready={forecastReady}
                hasMultipleAccounts={accountList.length > 1}
                canCompare={otherSets.length > 0}
                onExportCsv={exportForecastCsv}
                onCopyCsv={copyForecastCsv}
                onExportAll={exportAllAccountsCsv}
                onCopySummary={copyForecastSummary}
                onCompare={() => (compareOpen = true)}
                onCopyShare={copyShareLink}
              />
            </div>
          </SetSwitcher>
          {#if compareOpen && compared && compareOther}
            <ScenarioCompare
              leftName={scenarioName}
              rightName={compareOther.name}
              left={compared.left}
              right={compared.right}
              lines={compared.lines}
              others={otherSets.map((set) => ({ id: set.id, name: set.name }))}
              otherId={compareId}
              onPick={(id) => (compareId = id)}
              onOpen={openCompared}
              onClose={() => (compareOpen = false)}
            />
          {/if}
          {#if forecastReady}
            <div class="forecast-glance">
              <ForecastSummary entries={selectedEntries} {balanceFlags} useMainBalance={selectedIsMain} onScrollToRow={scrollToForecastRow} />
              <ForecastSparkline entries={selectedEntries} {balanceFlags} useMainBalance={selectedIsMain} />
            </div>
            <ForecastTable tableEntries={selectedEntries} accounts={accounts ?? {}} viewingMainAccount={selectedIsMain}></ForecastTable>
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
          <Labs entries={selectedEntries} {balanceFlags} useMainBalance={selectedIsMain} {forecastReady} />
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
    min-width: 0;
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
    min-width: 0;
    min-height: 0;
    overflow-x: clip;
    overflow-y: auto;
    position: relative;
    display: flex;
    flex-direction: column;
    padding-bottom: 0;
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
    width: 100%;
    max-width: 55em;
    margin: 0 auto;
    padding: 0.5rem 1rem 0.75rem;
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: hidden;

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
    min-width: 0;
    max-width: 100%;
  }

  .currency-mark {
    display: inline-flex;
    align-items: center;
    padding: 0.18rem 0.45rem;
    border: 1px solid var(--fb-gold);
    border-radius: 0.3rem;
    background: var(--fb-gold-soft);
    color: var(--fb-gold-ink);
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-decoration: none;
    line-height: 1.2;
  }

  .currency-mark:hover {
    background: #efe6c8;
  }

  .account-select {
    min-width: 0;
    flex: 1;
  }

  .account-select select {
    font-size: 0.85rem;
    padding: 0.25rem 0.4rem;
    border: 1px solid #d5d9d3;
    border-radius: 0.35rem;
    max-width: 100%;
    width: 100%;
  }

  .forecast-column > :global(.bar),
  .forecast-glance {
    flex-shrink: 0;
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
      max-height: 22vh;
      overflow: auto;
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
