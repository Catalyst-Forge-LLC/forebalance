import { get } from 'svelte/store';
import { settingsStore } from '$lib/stores/settings';
import type { Settings } from '$lib/parser/types';

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
		date3: (val?: Date | null) => (val ?? new Date()).toISOString().substring(0, 10),
		upper: (val: string) => val.toUpperCase(),
		lower: (val: string) => val.toLowerCase(),
		curr: (val: number | string) => currFormatter.format(+val),
		pct: (val: number) => Math.floor(val * 100) + '%',
	};
}

/** Module-level formatter using current settings store snapshot. */
export const fmt = createFormatter();
