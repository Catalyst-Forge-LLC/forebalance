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
	import About from '../components/About.svelte';
	import Privacy from '../components/Privacy.svelte';

	import { initializeData } from '$lib/data/initializeData';
	import { forecastBlockReason } from '$lib/parser/forecastReady';
	import { onMount, onDestroy } from 'svelte';
	import { logd } from '$lib/util/log';
	import Icon from '../components/Icon.svelte';
	import SetSwitcher from '../components/SetSwitcher.svelte';

  let accountEntries = {};
  let accounts;
  let selectedAccountId = '';
  let parseTimer: ReturnType<typeof setTimeout> | undefined;
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

  $: if ($rawEntriesStore && $settingsStore.monthsToForecast && balanceFlags) {
    const raw = $rawEntriesStore;
    if (parseTimer) clearTimeout(parseTimer);
    if (!parsedOnce) {
      applyParsed(raw);
    } else {
      parseTimer = setTimeout(() => applyParsed(raw), 350);
    }
  }

  onDestroy(() => {
    if (parseTimer) clearTimeout(parseTimer);
  });

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
      <Tab id="help"><Icon name="help" /> <span class="tab-label">Help</span></Tab>
      <Tab id="about"><Icon name="about" /> <span class="tab-label">About</span></Tab>
      <Tab id="privacy"><Icon name="privacy" /> <span class="tab-label">Privacy</span></Tab>
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
        <SetSwitcher editable={false} />
        {#if forecastReady}
          {#if accountList.length > 1}
            <div class="account-picker">
              <p class="account-picker-heading">Account in this scenario</p>
              <p class="account-picker-help">{selectedAccountHelp(selectedAccount)}</p>
              {#if accountList.length > 4}
                <label class="account-select">
                  <span class="sr-only">Select account</span>
                  <select
                    value={selectedAccountId}
                    on:change={(e) => (selectedAccountId = e.currentTarget.value)}
                  >
                    {#each accountList as account}
                      <option value={account.id}>{formatAccountOption(account)}</option>
                    {/each}
                  </select>
                </label>
              {:else}
                <div class="account-buttons">
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
            </div>
          {/if}
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
      </TabPanel>
      <TabPanel>
        <Settings></Settings>
      </TabPanel>
      <TabPanel>
        <Help></Help>
      </TabPanel>
      <TabPanel>
        <About></About>
      </TabPanel>
      <TabPanel>
        <Privacy></Privacy>
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
    overflow: auto;
    position: relative;
    padding-bottom: 4rem;
  }

  .forecast-empty {
    max-width: 36em;
    margin: 1.5rem auto;
    padding: 1rem 1.25rem;
    text-align: left;
    background: #fff8e6;
    border: 1px solid #cc8800;
    border-radius: 0.5rem;

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

  .account-picker {
    max-width: 55em;
    margin: 0.5rem auto 1rem;
    padding: 0.75rem 1rem;
    text-align: left;
    background: #f8fff8;
    border: 1px solid #cce8cc;
    border-radius: 0.5rem;

    .account-picker-heading {
      margin: 0 0 0.25rem;
      font-size: 0.95rem;
      font-weight: 700;
      color: #006600;
    }

    .account-picker-help {
      margin: 0 0 0.75rem;
      font-size: 0.85rem;
      color: #444;
      line-height: 1.4;
    }

    .account-select select {
      width: 100%;
      max-width: 40em;
      font-size: 0.95rem;
      padding: 0.4rem 0.5rem;
      border: 1px solid #009900;
      border-radius: 0.35rem;
    }

    .account-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

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
