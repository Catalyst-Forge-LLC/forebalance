import { get } from "svelte/store";
import { settingsStore } from './stores';

const locale = get(settingsStore).locale;
const currencyIsoCode = get(settingsStore).currencyIsoCode;

const currFormtter = new Intl.NumberFormat(get(settingsStore).locale, {
    style: 'currency',
    currency: currencyIsoCode,

    // These options are needed to round to whole numbers if that's what you want.
    minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
    maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)
});

export const fmt = {
    date: val => (val ? val : new Date()).toLocaleDateString(locale, {
        year: '2-digit',
        month: 'numeric',
        day: 'numeric'
    }),
    date2: val => new Intl.DateTimeFormat(
        locale, 
        { month: 'long', year: 'numeric'}
    ).format((val ? val : new Date())),
    date3: val => (val ? val : new Date()).toISOString().substring(0, 10),
    upper: val => val.toUpperCase(),
    lower: val => val.toLowerCase(),
    curr: val => currFormtter.format(val),
    pct: val => Math.floor(val * 100) + '%'
};
