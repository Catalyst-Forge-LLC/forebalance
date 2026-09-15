import { get, writable } from 'svelte/store';
import type { Settings } from '$lib/parser/types';
import { defaultSettings } from '$lib/data/defaultSettings';

export const settingsStore = writable<Settings>({ ...defaultSettings });
export const rawEntriesStore = writable('');
export const appStateStore = writable({ showLoader: false });

export function persistSettings(next: Settings): void {
	settingsStore.set(next);
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem('settings', JSON.stringify(next));
}

export function applyDisplayCurrency(code: string): void {
	const current = get(settingsStore);
	if (current.currencyIsoCode === code) return;
	persistSettings({ ...current, currencyIsoCode: code });
}
