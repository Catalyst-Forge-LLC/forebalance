import { storage } from '#lib/persistence/storage.ts';
import { get, writable } from 'svelte/store';
import type { Settings } from '#lib/parser/types.ts';
import { defaultSettings } from '#lib/data/defaultSettings.ts';
import { scaleThresholdSettings } from '#lib/data/thresholdScale.ts';

export const settingsStore = writable<Settings>({ ...defaultSettings });
export const rawEntriesStore = writable('');
export const appStateStore = writable({ showLoader: false });

export function persistSettings(next: Settings): void {
  settingsStore.set(next);
  storage.setItem('settings', JSON.stringify({ version: 1, settings: next }));
}

export function applyDisplayCurrency(code: string, opts: { scaleThresholds?: boolean } = {}): void {
  const current = get(settingsStore);
  if (current.currencyIsoCode === code) return;
  const next = opts.scaleThresholds
    ? { ...scaleThresholdSettings(current, current.currencyIsoCode, code), currencyIsoCode: code }
    : { ...current, currencyIsoCode: code };
  persistSettings(next);
}
