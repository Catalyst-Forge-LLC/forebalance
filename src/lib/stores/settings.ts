import { writable } from 'svelte/store';
import type { Settings } from '$lib/parser/types';
import { defaultSettings } from '$lib/data/defaultSettings';

export const settingsStore = writable<Settings>({ ...defaultSettings });
export const rawEntriesStore = writable('');
export const appStateStore = writable({ showLoader: false });
