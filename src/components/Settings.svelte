<script lang="ts">
    import { defaultSettings } from '$lib/data/defaultSettings';
    import { resetAllData } from '$lib/data/entriesPersistence';
    import { settingsStore } from '$lib/stores/settings';
    import type { Settings } from '$lib/parser/types';
    import ConfirmResetModal from './ConfirmResetModal.svelte';
    import Icon from './Icon.svelte';

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
        monthsToForecast: { label: 'Months to forecast', min: 3, max: 24, step: 1 },
        thresholdGoalBalance: { label: 'Goal balance', min: 500, max: 20000, step: 100 },
        thresholdUncomfortableBalance: { label: 'Uncomfortable balance', min: 50, max: 10000, step: 50 },
        thresholdLowBalance: { label: 'Low balance', min: 50, max: 10000, step: 50 },
    };

    let draftSettings = { ...$settingsStore };
    let resetOpen = false;

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

    function confirmReset() {
        resetAllData();
        draftSettings = { ...defaultSettings };
        resetOpen = false;
    }
</script>

<div class="settings-panel">
    <section class="panel">
        <h2>Forecast thresholds</h2>
        <p class="help">
            These apply to whichever scenario you are viewing on Forecast. They do not change your
            entry text.
        </p>

        {#each Object.entries(ranges) as [key, range]}
            <label class="range-label">
                {range.label}
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

        <label class="checkbox-row">
            <input
                type="checkbox"
                bind:checked={draftSettings.useFederalHolidays}
                on:change={commitSettings}
            />
            <span>
                Treat US federal holidays as non-business days when using
                <code>R&lt;</code> / <code>R&gt;</code> date shifting
            </span>
        </label>
    </section>

    <section class="panel danger">
        <h2>Reset</h2>
        <p class="help">
            Replace every scenario with the four starters and restore default thresholds.
            You will be asked to export a backup and type RESET.
        </p>
        <button type="button" class="button-action" on:click={() => (resetOpen = true)}>
            <Icon name="alert" /> Reset all scenarios and settings
        </button>
    </section>
</div>

<ConfirmResetModal
    open={resetOpen}
    onCancel={() => (resetOpen = false)}
    onConfirm={confirmReset}
/>

<style lang="scss">
    .settings-panel {
        max-width: 55em;
        margin: 0 auto;
        padding: 0.75rem 1rem 1rem;
        text-align: left;
    }

    .panel {
        margin: 0 0 1rem;
        padding: 0.85rem 1rem 1rem;
        background: #f8fff8;
        border: 1px solid #cce8cc;
        border-radius: 0.5rem;

        h2 {
            margin: 0 0 0.35rem;
            font-size: 1rem;
            color: #006600;
        }
    }

    .danger {
        background: #fff8f4;
        border-color: #e8ccbb;

        h2 {
            color: #663300;
        }
    }

    .help {
        margin: 0 0 0.85rem;
        font-size: 0.85rem;
        color: #444;
        line-height: 1.4;
        padding: 0;
    }

    .range-label {
        display: block;
        font-weight: 700;
        font-size: 0.9rem;
        color: #004400;
        margin-top: 1rem;

        &:first-of-type {
            margin-top: 0;
        }
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

    .checkbox-row {
        display: flex;
        gap: 0.6rem;
        align-items: flex-start;
        margin-top: 1.25rem;
        font-size: 0.95rem;
        line-height: 1.45;
        cursor: pointer;

        input {
            flex-shrink: 0;
            margin-top: 0.2rem;
        }

        code {
            font-size: 0.9em;
            white-space: nowrap;
        }
    }

    .panel :global(.button-action) {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        margin: 0;
    }
</style>
