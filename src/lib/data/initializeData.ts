import { settingsStore, rawEntriesStore, appStateStore } from '$lib/stores/settings';
import { defaultEntries } from '$lib/data/defaultEntries';
import { defaultSettings } from '$lib/data/defaultSettings';

export function initializeData(): void {
	const lsRawEntries = localStorage.getItem('rawEntries');
	if (lsRawEntries) {
		rawEntriesStore.set(lsRawEntries);
	} else {
		rawEntriesStore.set(defaultEntries);
	}

	const lsSettings = localStorage.getItem('settings');
	if (lsSettings) {
		settingsStore.set(JSON.parse(lsSettings));
	} else {
		settingsStore.set({ ...defaultSettings });
	}
}

export { settingsStore, rawEntriesStore, appStateStore };
