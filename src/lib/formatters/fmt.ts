import { get } from 'svelte/store';
import { settingsStore } from '$lib/stores/settings';
import type { Settings } from '$lib/parser/types';
import { localIsoDate } from './dates';

function getSettings(): Settings {
	return get(settingsStore);
}

export function createFormatter(settings: Settings = getSettings()) {
	const currFormatter = new Intl.NumberFormat(settings.locale, {
		style: 'currency',
		currency: settings.currencyIsoCode,
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	});

	return {
		date: (val?: Date | null) =>
			(val ?? new Date()).toLocaleDateString(settings.locale, {
				year: '2-digit',
				month: 'numeric',
				day: 'numeric',
			}),
		date2: (val?: Date | null) =>
			new Intl.DateTimeFormat(settings.locale, { month: 'long', year: 'numeric' }).format(
				val ?? new Date(),
			),
		date3: (val?: Date | null) => localIsoDate(val),
		upper: (val: string) => val.toUpperCase(),
		lower: (val: string) => val.toLowerCase(),
		curr: (val: number | string) => currFormatter.format(+val),
		pct: (val: number) => Math.floor(val * 100) + '%',
	};
}

/** Live formatter. Methods update when Settings currency or locale changes. */
export const fmt = createFormatter();

settingsStore.subscribe((settings) => {
	const next = createFormatter(settings);
	fmt.date = next.date;
	fmt.date2 = next.date2;
	fmt.date3 = next.date3;
	fmt.upper = next.upper;
	fmt.lower = next.lower;
	fmt.curr = next.curr;
	fmt.pct = next.pct;
});
