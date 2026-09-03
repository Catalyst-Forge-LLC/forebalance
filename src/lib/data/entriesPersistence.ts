import { get } from 'svelte/store';
import { defaultEntries } from '$lib/data/defaultEntries';
import { defaultSettings } from '$lib/data/defaultSettings';
import { restoreLinkedFile, writeLinkedPsvFile } from '$lib/persistence/psvPersistence';
import { rawEntriesStore, settingsStore } from '$lib/stores/settings';

export async function persistRawEntries(rawEntries: string): Promise<void> {
	localStorage.setItem('rawEntries', rawEntries);
	await writeLinkedPsvFile(rawEntries);
}

export function setRawEntries(rawEntries: string): void {
	rawEntriesStore.set(rawEntries);
	void persistRawEntries(rawEntries);
}

export async function initializeData(): Promise<void> {
	const linked = await restoreLinkedFile();
	if (linked) {
		rawEntriesStore.set(linked.content);
		localStorage.setItem('rawEntries', linked.content);
	} else {
		const lsRawEntries = localStorage.getItem('rawEntries');
		rawEntriesStore.set(lsRawEntries ?? defaultEntries);
	}

	const lsSettings = localStorage.getItem('settings');
	settingsStore.set(lsSettings ? JSON.parse(lsSettings) : { ...defaultSettings });
}

export function getRawEntries(): string {
	return get(rawEntriesStore);
}
