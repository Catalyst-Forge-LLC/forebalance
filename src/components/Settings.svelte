<script>
    import { fmt } from '../scripts/fmt';

    import { defaultEntries } from '../scripts/defaultEntries';
    import { defaultSettings } from '../scripts/defaultSettings';

    const ranges = {
        monthsToForecast: { label: 'Months to Forecast', min: 3, max: 24, step: 1 },
        thresholdGoalBalance: { label: 'Goal Balance Threshold', min: 1000, max: 20000, step: 500 },
        thresholdUncomfortableBalance: { label: 'Uncomfortable Balance Threshold', min: 100, max: 10000, step: 100 },
        thresholdLowBalance: { label: 'Low Balance Threshold', min: 100, max: 10000, step: 100 },
    };

    import { settingsStore, rawEntriesStore } from '../scripts/stores';

    function saveSettings(e) {
		localStorage.setItem('settings', JSON.stringify($settingsStore));
    }

	function resetEntries() {
		if (confirm('Are you sure you want to reset the entries and settings? Any customized data will be cleared and the tool will be reset to the default entries.')) {
			localStorage.clear();
			$rawEntriesStore = defaultEntries;
			$settingsStore = defaultSettings;
		}
    }

    function downloadEntries() {
        var element = document.createElement('a');
        let fileName = 'myBalanceForcaster-' + fmt.date3() + '-entries.psv';
        let fileContent = $rawEntriesStore;
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(fileContent));
        element.setAttribute('download', fileName);

        element.style.display = 'none';
        document.body.appendChild(element);

        element.click();

        document.body.removeChild(element);
    }

</script>

<div class="settings">
    {#each Object.entries(ranges) as [key, range]}
        <label>
            {range.label}:<br>
            {$settingsStore[key]} <input type=range min={range.min} max={range.max} step={range.step} on:change={saveSettings} bind:value={$settingsStore[key]}>
        </label>
    {/each}
</div>
<button class="button-action" on:click={resetEntries}>Reset Entries and Settings</button>
<button class="button-action" on:click={downloadEntries}>Download Entries</button>

<style lang="scss">
    .settings {
        label {
            display: block;
            font-weight: bold;
        }

        label:not(:first-of-type) {
            margin-top: 1.5rem;
        }
    }

</style>