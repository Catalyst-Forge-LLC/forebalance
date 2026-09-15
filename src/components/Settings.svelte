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
            balanceIncludesSameDay: draftSettings.balanceIncludesSameDay,
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
            entry text. The table uses them to mark projected balances. Those marks are not a
            promise that a real account will land there. This is not financial advice.
            See <a href="#about">About</a> for the full disclaimer.
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

        <label class="checkbox-row">
            <input
                type="checkbox"
                bind:checked={draftSettings.balanceIncludesSameDay}
                on:change={commitSettings}
            />
            <span>
                A balance line is the end-of-day number (on by default). Credits and debits dated
                the same day as a <code>B</code> line are already in it, so they show on Forecast
                but do not change the balance again. If one has not posted yet, open that Forecast
                row and check <em>Not yet posted</em>. Turn this off if you enter a balance before
                the day's activity hits.
            </span>
        </label>
    </section>

    <section class="panel">
        <h2>Saving your work</h2>
        <p class="help">
            The active scenario, the month count, and these thresholds stay in this browser on this
            device. Clearing site data deletes them. That is not a durable backup.
        </p>
        <p class="help">
            Export the current scenario from Entries, or export every scenario from Reset below. A
            linked file, when your browser supports it, is also only on this device.
        </p>
    </section>

    <section class="panel danger">
        <h2>Reset</h2>
        <p class="help">
            Replace every scenario with the four starters and restore default thresholds.
            You will be asked to export a copy and type RESET.
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
    @use '../scss/colors' as *;

    .settings-panel {
        max-width: 55em;
        margin: 0 auto;
        padding: 0.75rem 1rem 1rem;
        text-align: left;
    }

    .panel {
        margin: 0 0 1rem;
        padding: 0.85rem 1rem 1rem;
        background: $clr-surface;
        border: 1px solid $clr-border;
        border-radius: 0.4rem;

        h2 {
            margin: 0 0 0.35rem;
            font-size: 1rem;
            color: $clr-accent-ink;
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
        color: $clr-accent-ink;
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
