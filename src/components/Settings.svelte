<script lang="ts">
    import { listedCurrencies } from '$lib/data/currencies';
    import { ensureCurrencyHeader } from '$lib/data/currencyHeader';
    import { defaultSettings } from '$lib/data/defaultSettings';
    import { scaleThresholdSettings, thresholdSliderRange } from '$lib/data/thresholdScale';
    import { resetAllData, setRawEntries } from '$lib/data/entriesPersistence';
    import { persistSettings, rawEntriesStore, settingsStore } from '$lib/stores/settings';
    import {
        categoriesStore,
        deleteCategory,
        loadCategories,
        persistCategories,
        uniqueCategoryId,
        UNFILED_ID,
        type Category,
    } from '$lib/data/categories';
    import { onMount } from 'svelte';
    import ConfirmResetModal from './ConfirmResetModal.svelte';
    import Icon from './Icon.svelte';

    const currencies = listedCurrencies();

    $: goalRange = thresholdSliderRange('thresholdGoalBalance', $settingsStore.currencyIsoCode);
    $: uncomfRange = thresholdSliderRange(
        'thresholdUncomfortableBalance',
        $settingsStore.currencyIsoCode,
    );
    $: lowRange = thresholdSliderRange('thresholdLowBalance', $settingsStore.currencyIsoCode);
    $: ranges = {
        monthsToForecast: { label: 'Months to forecast', min: 3, max: 24, step: 1 },
        thresholdGoalBalance: { label: 'Goal balance', ...goalRange },
        thresholdUncomfortableBalance: { label: 'Uncomfortable balance', ...uncomfRange },
        thresholdLowBalance: { label: 'Low balance', ...lowRange },
    };

    let draftSettings = { ...$settingsStore };
    let resetOpen = false;
    let newCategoryName = '';

    onMount(() => loadCategories());

    function renameCategory(category: Category, name: string) {
        if (category.id === UNFILED_ID) return;
        persistCategories(
            $categoriesStore.map((item) => (item.id === category.id ? { ...item, name } : item)),
        );
    }

    function moveCategory(index: number, direction: -1 | 1) {
        const list = $categoriesStore.filter((category) => category.id !== UNFILED_ID);
        const nextIndex = index + direction;
        if (nextIndex < 0 || nextIndex >= list.length) return;
        const swapped = [...list];
        [swapped[index], swapped[nextIndex]] = [swapped[nextIndex], swapped[index]];
        persistCategories(swapped);
    }

    function removeCategory(id: string) {
        const name = $categoriesStore.find((category) => category.id === id)?.name ?? id;
        if (!confirm(`Delete “${name}”? Entries in it move to Unfiled.`)) return;
        deleteCategory(id);
    }

    function addCategory() {
        const name = newCategoryName.trim();
        if (!name) return;
        const id = uniqueCategoryId(name, $categoriesStore);
        persistCategories([...$categoriesStore, { id, name, order: $categoriesStore.length }]);
        newCategoryName = '';
    }

    $: draftSettings.thresholdGoalBalance = $settingsStore.thresholdGoalBalance;
    $: draftSettings.thresholdUncomfortableBalance = $settingsStore.thresholdUncomfortableBalance;
    $: draftSettings.thresholdLowBalance = $settingsStore.thresholdLowBalance;

    function draftWithoutCurrency() {
        return {
            ...$settingsStore,
            monthsToForecast: draftSettings.monthsToForecast,
            thresholdGoalBalance: draftSettings.thresholdGoalBalance,
            thresholdUncomfortableBalance: draftSettings.thresholdUncomfortableBalance,
            thresholdLowBalance: draftSettings.thresholdLowBalance,
            useFederalHolidays: draftSettings.useFederalHolidays,
            balanceIncludesSameDay: draftSettings.balanceIncludesSameDay,
        };
    }

    function changeCurrency(toCode: string) {
        const fromCode = $settingsStore.currencyIsoCode;
        if (fromCode === toCode) return;
        const next = scaleThresholdSettings(draftWithoutCurrency(), fromCode, toCode);
        persistSettings({ ...next, currencyIsoCode: toCode });
        const stamped = ensureCurrencyHeader($rawEntriesStore, toCode);
        if (stamped !== $rawEntriesStore) setRawEntries(stamped);
    }

    function commitSettings() {
        persistSettings({
            ...draftWithoutCurrency(),
            currencyIsoCode: $settingsStore.currencyIsoCode,
        });
    }

    function confirmReset() {
        resetAllData();
        draftSettings = { ...defaultSettings };
        resetOpen = false;
    }
</script>

<div class="settings-panel">
    <section class="panel">
        <h2>Display currency</h2>
        <p class="help">
            How amounts look on Forecast, Welcome, Labs, and copied summaries. It does
            <strong>not</strong> convert numbers in your entries. Threshold marks are rescaled
            to a similar household size (rounded, not a live exchange rate). Exports include
            this code. An import without one will ask before using it.
        </p>
        <label class="select-label">
            Currency
            <select
                value={$settingsStore.currencyIsoCode}
                on:change={(event) => changeCurrency(event.currentTarget.value)}
            >
                {#each currencies as option}
                    <option value={option.code}>{option.label}</option>
                {/each}
            </select>
        </label>
    </section>

    <section class="panel">
        <h2>Forecast thresholds</h2>
        <p class="help">
            These apply to whichever scenario you are viewing on Forecast. They do not change your
            entry text. The table uses them to mark projected balances. Changing currency
            rescales them to a rounded household-sized mark — not an exact conversion. Those
            marks are not a promise that a real account will land there. This is not financial
            advice. See <a href="#about">About</a> for the full disclaimer.
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
    </section>

    <section class="panel">
        <h2>Dates and balances</h2>
        <p class="help">
            These change how the forecast reads your entries. They are not threshold marks.
        </p>

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
                A balance you enter is the end-of-day number (on by default). Money in and money out
                dated the same day as a <code>B</code> entry are already in it, so they show on Forecast
                but do not change the balance again. If one has not posted yet, open that Forecast
                row and check <em>Not yet posted</em>. Turn this off if you enter a balance before
                the day's activity hits.
            </span>
        </label>
    </section>

    <section class="panel">
        <h2>Categories</h2>
        <p class="help">
            Names for the groups on your entries. Deleting a category moves those entries to
            Unfiled. It does not delete the entries.
        </p>
        <ul class="category-list">
            {#each $categoriesStore.filter((category) => category.id !== UNFILED_ID) as category, index}
                <li>
                    <input
                        value={category.name}
                        aria-label="Rename {category.name}"
                        on:change={(event) => renameCategory(category, event.currentTarget.value)}
                    />
                    <button type="button" on:click={() => moveCategory(index, -1)} aria-label="Move up">Up</button>
                    <button type="button" on:click={() => moveCategory(index, 1)} aria-label="Move down">Down</button>
                    <button type="button" on:click={() => removeCategory(category.id)}>Delete</button>
                </li>
            {/each}
        </ul>
        <form class="add-category" on:submit|preventDefault={addCategory}>
            <input bind:value={newCategoryName} placeholder="New category" aria-label="New category" />
            <button type="submit">Add</button>
        </form>
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

    .select-label {
        display: block;
        font-weight: 700;
        font-size: 0.9rem;
        color: $clr-accent-ink;

        select {
            display: block;
            width: min(22em, 100%);
            margin-top: 0.35rem;
            padding: 0.35rem 0.5rem;
            font-size: 1rem;
            border: 1px solid $clr-border-strong;
            border-radius: 0.35rem;
            background: $clr-surface;
        }
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

        &:first-of-type {
            margin-top: 0;
        }

        input {
            flex-shrink: 0;
            margin-top: 0.2rem;
        }

        code {
            font-size: 0.9em;
            white-space: nowrap;
        }
    }

    .category-list {
        list-style: none;
        margin: 0.5rem 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;

        li {
            display: flex;
            gap: 0.35rem;
            align-items: center;
        }

        input { flex: 1; }
    }

    .add-category {
        display: flex;
        gap: 0.35rem;
    }

    .panel :global(.button-action) {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        margin: 0;
    }
</style>
