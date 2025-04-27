import { writable } from 'svelte/store';

export const settingsStore = writable({
    thresholdGoalBalance: 5000,
    thresholdUncomfortableBalance: 1000,
    thresholdLowBalance: 500,
    monthsToForecast: 6,
    locale: 'en-US',
    currencyIsoCode: 'USD'
});


export const rawEntriesStore = writable('');

export const appStateStore = writable({
    showLoader: false
});