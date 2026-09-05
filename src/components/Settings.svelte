<script lang="ts">
    import { fmt } from '$lib/formatters/fmt';
    import { defaultEntries } from '$lib/data/defaultEntries';
    import { defaultSettings } from '$lib/data/defaultSettings';
    import { setEntriesSource } from '$lib/data/entriesPersistence';
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

    let draftSettings = { ...$settingsStore };

    function commitSettings() {
        $settingsStore = {
            ...$settingsStore,
            monthsToForecast: draftSettings.monthsToForecast,
            thresholdGoalBalance: draftSettings.thresholdGoalBalance,
            thresholdUncomfortableBalance: draftSettings.thresholdUncomfortableBalance,
            thresholdLowBalance: draftSettings.thresholdLowBalance,
            useFederalHolidays: draftSettings.useFederalHolidays,
        };
        localStorage.setItem('settings', JSON.stringify($settingsStore));
    }

    function onEntriesSourceChange(useDemo: boolean) {
        if (useDemo === $settingsStore.useDemoEntries) return;
        setEntriesSource(useDemo);
    }

	function resetEntries() {
		if (confirm('Are you sure you want to reset the entries and settings? Any customized data will be cleared and the tool will be reset to the default entries.')) {
			localStorage.clear();
			$rawEntriesStore = defaultEntries;
			$settingsStore = { ...defaultSettings };
            draftSettings = { ...defaultSettings };
            localStorage.setItem('userEntries', defaultEntries);
            localStorage.setItem('rawEntries', defaultEntries);
            localStorage.setItem('settings', JSON.stringify($settingsStore));
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

<div class="settings-panel">
    <div class="settings">
        <fieldset class="entries-source">
            <legend>Forecast entries</legend>
            <p class="field-help">
                Switch between your saved entries and the built-in sample forecast.
            </p>
            <div class="source-options">
                <label class="source-option">
                    <input
                        type="radio"
                        name="entries-source"
                        checked={!$settingsStore.useDemoEntries}
                        on:change={() => onEntriesSourceChange(false)}
                    />
                    My entries
                </label>
                <label class="source-option">
                    <input
                        type="radio"
                        name="entries-source"
                        checked={$settingsStore.useDemoEntries}
                        on:change={() => onEntriesSourceChange(true)}
                    />
                    Sample data
                </label>
            </div>
            {#if $settingsStore.useDemoEntries}
                <p class="demo-notice">Viewing sample data. Your entries are saved and restore when you switch back.</p>
            {/if}
        </fieldset>

        {#each Object.entries(ranges) as [key, range]}
            <label>
                {range.label}:
                <div class="control-row">
                    <input
                        type="number"
                        min={range.min}
                        max={range.max}
                        step={range.step}
                        bind:value={draftSettings[key]}
                        on:change={commitSettings}
                        on:blur={commitSettings}
                    />
                    <input
                        type="range"
                        min={range.min}
                        max={range.max}
                        step={range.step}
                        bind:value={draftSettings[key]}
                        on:change={commitSettings}
                    />
                </div>
            </label>
        {/each}

        <div class="checkbox-row">
            <label>
                <input
                    type="checkbox"
                    bind:checked={draftSettings.useFederalHolidays}
                    on:change={commitSettings}
                />
                <span class="checkbox-text">
                    Treat US federal holidays as non-business days when using
                    <code>R&lt;</code> / <code>R&gt;</code> date shifting
                </span>
            </label>
        </div>
    </div>

    <div class="settings-actions">
        <button type="button" class="button-action" on:click={resetEntries}>Reset Entries and Settings</button>
        <button type="button" class="button-action" on:click={downloadEntries}>Download Entries</button>
    </div>
</div>

<style lang="scss">
    .settings-panel {
        max-width: 55em;
        margin: 0 auto;
        padding: 0 1rem;
    }

    .settings {
        label:not(.source-option):not(.checkbox-row label) {
            display: block;
            font-weight: bold;
            text-align: left;
        }

        label:not(:first-of-type):not(.source-option) {
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

    .entries-source {
        margin: 0 0 1.5rem;
        padding: 0.75rem 1rem 1rem;
        border: 1px solid #cce8cc;
        border-radius: 0.5rem;
        background: #f8fff8;
        text-align: left;

        legend {
            font-weight: 700;
            color: #006600;
            padding: 0 0.25rem;
        }
    }

    .field-help {
        margin: 0.25rem 0 0.75rem;
        font-size: 0.9rem;
        color: #444;
        line-height: 1.4;
    }

    .source-options {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem 2rem;
    }

    .source-option {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        font-weight: normal;
        cursor: pointer;
    }

    .demo-notice {
        margin: 0.75rem 0 0;
        font-size: 0.85rem;
        color: #664400;
    }

    .checkbox-row {
        margin-top: 1.5rem;
        text-align: left;

        label {
            display: flex;
            gap: 0.6rem;
            align-items: flex-start;
            font-weight: normal;
            font-size: 0.95rem;
            line-height: 1.45;
            cursor: pointer;
        }

        input[type='checkbox'] {
            flex-shrink: 0;
            margin-top: 0.2rem;
        }

        .checkbox-text {
            flex: 1;
        }

        code {
            font-size: 0.9em;
            white-space: nowrap;
        }
    }

    .settings-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        justify-content: center;
        margin-top: 1.5rem;
    }
</style>
