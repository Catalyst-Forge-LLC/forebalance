<script lang="ts">
    import { fmt } from '$lib/formatters/fmt';
    import { defaultSettings } from '$lib/data/defaultSettings';
    import {
        addSetFromTemplate,
        cloneEntrySet,
        deleteEntrySet,
        entrySetsStore,
        listTemplates,
        renameEntrySet,
        switchEntrySet,
        updateActiveRaw,
    } from '$lib/data/entrySets';
    import { activateEntrySet, resetAllData } from '$lib/data/entriesPersistence';
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
        thresholdGoalBalance: { label: 'Goal Balance Threshold', min: 500, max: 20000, step: 100 },
        thresholdUncomfortableBalance: { label: 'Uncomfortable Balance Threshold', min: 50, max: 10000, step: 50 },
        thresholdLowBalance: { label: 'Low Balance Threshold', min: 50, max: 10000, step: 50 },
    };

    let draftSettings = { ...$settingsStore };
    let draftName = '';
    let lastActiveId = '';
    let templateToAdd = listTemplates()[0]?.id ?? 'close-month';

    $: activeSet = $entrySetsStore.sets.find((set) => set.id === $entrySetsStore.activeId);
    $: if (activeSet && activeSet.id !== lastActiveId) {
        lastActiveId = activeSet.id;
        draftName = activeSet.name;
    }
    $: canDelete = $entrySetsStore.sets.length > 1;
    $: templates = listTemplates();

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

    function onSelectSet(id: string) {
        if (id === $entrySetsStore.activeId) return;
        const next = switchEntrySet(id, $rawEntriesStore);
        if (next) {
            activateEntrySet(next.raw);
            draftName = next.name;
        }
    }

    function commitName() {
        if (!activeSet) return;
        const next = renameEntrySet(activeSet.id, draftName);
        const renamed = next.sets.find((set) => set.id === activeSet.id);
        draftName = renamed?.name ?? draftName;
    }

    function onClone() {
        if (!activeSet) return;
        updateActiveRaw($rawEntriesStore);
        const clone = cloneEntrySet(activeSet.id);
        lastActiveId = clone.id;
        activateEntrySet(clone.raw);
        draftName = clone.name;
    }

    function onDelete() {
        if (!activeSet || !canDelete) return;
        if (!confirm(`Delete “${activeSet.name}”? This cannot be undone.`)) return;
        const next = deleteEntrySet(activeSet.id);
        const selected = next.sets.find((set) => set.id === next.activeId);
        if (selected) {
            activateEntrySet(selected.raw);
            draftName = selected.name;
        }
    }

    function onAddTemplate() {
        updateActiveRaw($rawEntriesStore);
        const added = addSetFromTemplate(templateToAdd);
        lastActiveId = added.id;
        activateEntrySet(added.raw);
        draftName = added.name;
    }

	function resetEntries() {
		if (confirm('Reset all entry sets and settings to the built-in 2026 starters? Your current sets will be removed.')) {
            resetAllData();
			$settingsStore = { ...defaultSettings };
            draftSettings = { ...defaultSettings };
            draftName = $entrySetsStore.sets.find((set) => set.id === $entrySetsStore.activeId)?.name ?? '';
		}
    }

    function downloadEntries() {
        const slug = (activeSet?.name ?? 'entries').toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const element = document.createElement('a');
        const fileName = `forebalance-${fmt.date3()}-${slug}.psv`;
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
            <legend>Entry sets</legend>
            <p class="field-help">
                Keep more than one forecast — a tight month, a what-if, a second household.
                Edit the current set on the Entries tab. You can rename, clone, or delete sets
                (the last remaining set stays).
            </p>

            <label class="set-select">
                Current set
                <select
                    value={$entrySetsStore.activeId}
                    on:change={(e) => onSelectSet(e.currentTarget.value)}
                >
                    {#each $entrySetsStore.sets as set}
                        <option value={set.id}>{set.name}</option>
                    {/each}
                </select>
            </label>

            <label class="set-name">
                Name
                <input
                    id="entry-set-name"
                    type="text"
                    bind:value={draftName}
                    on:change={commitName}
                    on:blur={commitName}
                />
            </label>

            <div class="set-actions">
                <button type="button" class="button-action" on:click={onClone}>Clone set</button>
                <button type="button" class="button-action" on:click={onDelete} disabled={!canDelete}>
                    Delete set
                </button>
            </div>

            <div class="template-row">
                <label>
                    New from starter
                    <select bind:value={templateToAdd}>
                        {#each templates as template}
                            <option value={template.id}>{template.name}</option>
                        {/each}
                    </select>
                </label>
                <button type="button" class="button-action" on:click={onAddTemplate}>Add</button>
            </div>
            {#if templates.find((t) => t.id === templateToAdd)}
                <p class="template-blurb">{templates.find((t) => t.id === templateToAdd)?.blurb}</p>
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
        <button type="button" class="button-action" on:click={resetEntries}>Reset all sets and settings</button>
        <button type="button" class="button-action" on:click={downloadEntries}>Download current set</button>
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

        label:not(:first-of-type):not(.source-option):not(.set-name):not(.set-select) {
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

        select,
        input[type='text'] {
            display: block;
            width: 100%;
            max-width: 28em;
            margin-top: 0.25rem;
            font-size: 1rem;
            padding: 0.35rem 0.5rem;
        }
    }

    .field-help {
        margin: 0.25rem 0 0.75rem;
        font-size: 0.9rem;
        color: #444;
        line-height: 1.4;
    }

    .set-name,
    .set-select {
        margin-top: 0.85rem;
    }

    .set-actions,
    .template-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        align-items: flex-end;
        margin-top: 0.85rem;
    }

    .template-row label {
        flex: 1;
        min-width: 12em;
        margin-top: 0 !important;
    }

    .template-blurb {
        margin: 0.5rem 0 0;
        font-size: 0.85rem;
        color: #555;
        line-height: 1.4;
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

    button:disabled {
        opacity: 0.45;
        cursor: not-allowed;
    }
</style>
