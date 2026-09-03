<script lang="ts">
    import { fmt } from '$lib/formatters/fmt';
    import { defaultEntries } from '$lib/data/defaultEntries';
    import { defaultSettings } from '$lib/data/defaultSettings';
    import { settingsStore, rawEntriesStore } from '$lib/stores/settings';
    import type { Settings } from '$lib/parser/types';

    const ranges: Record<
        keyof Pick<
            Settings,
            | 'monthsToForecast'
            | 'thresholdGoalBalance'
            | 'thresholdUncomfortableBalance'
            | 'thresholdLowBalance'
        >,
        { label: string; min: number; max: number; step: number }
    > = {
        monthsToForecast: { label: 'Months to Forecast', min: 3, max: 24, step: 1 },
        thresholdGoalBalance: { label: 'Goal Balance Threshold', min: 1000, max: 20000, step: 500 },
        thresholdUncomfortableBalance: { label: 'Uncomfortable Balance Threshold', min: 100, max: 10000, step: 100 },
        thresholdLowBalance: { label: 'Low Balance Threshold', min: 100, max: 10000, step: 100 },
    };

    function saveSettings() {
		localStorage.setItem('settings', JSON.stringify($settingsStore));
    }

	function resetEntries() {
		if (confirm('Are you sure you want to reset the entries and settings? Any customized data will be cleared and the tool will be reset to the default entries.')) {
			localStorage.clear();
			$rawEntriesStore = defaultEntries;
			$settingsStore = { ...defaultSettings };
		}
    }

    function downloadEntries() {
        const element = document.createElement('a');
        const fileName = 'forebalance-' + fmt.date3() + '-entries.psv';
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent($rawEntriesStore));
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
            {range.label}:
            <div class="control-row">
                <input
                    type="number"
                    min={range.min}
                    max={range.max}
                    step={range.step}
                    bind:value={$settingsStore[key]}
                    on:change={saveSettings}
                />
                <input
                    type="range"
                    min={range.min}
                    max={range.max}
                    step={range.step}
                    bind:value={$settingsStore[key]}
                    on:change={saveSettings}
                />
            </div>
        </label>
    {/each}
</div>
<button type="button" class="button-action" on:click={resetEntries}>Reset Entries and Settings</button>
<button type="button" class="button-action" on:click={downloadEntries}>Download Entries</button>

<style lang="scss">
    .settings {
        label {
            display: block;
            font-weight: bold;
            text-align: left;
            max-width: 28em;
            margin: 0 auto;
        }

        label:not(:first-of-type) {
            margin-top: 1.5rem;
        }

        .control-row {
            display: flex;
            gap: 0.75rem;
            align-items: center;
            margin-top: 0.25rem;

            input[type='number'] {
                width: 6em;
                font-size: 1rem;
            }

            input[type='range'] {
                flex: 1;
            }
        }
    }
</style>
