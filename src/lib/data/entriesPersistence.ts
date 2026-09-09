import { get } from 'svelte/store';
import { defaultSettings } from '$lib/data/defaultSettings';
import {
	entrySetsStore,
	getActiveSet,
	loadEntrySets,
	migrateLegacyEntries,
	persistEntrySets,
	resetToStarterSets,
	updateActiveRaw,
} from '$lib/data/entrySets';
import { restoreLinkedFile, writeLinkedPsvFile } from '$lib/persistence/psvPersistence';
import { rawEntriesStore, settingsStore } from '$lib/stores/settings';

const USER_ENTRIES_KEY = 'userEntries';
const PERSIST_DELAY_MS = 800;

let persistTimer: ReturnType<typeof setTimeout> | undefined;
let pendingPersist: string | null = null;

function writeLocalCopies(rawEntries: string): void {
	localStorage.setItem('rawEntries', rawEntries);
	localStorage.setItem(USER_ENTRIES_KEY, rawEntries);
	updateActiveRaw(rawEntries);
}

export async function persistRawEntries(rawEntries: string): Promise<void> {
	writeLocalCopies(rawEntries);
	pendingPersist = rawEntries;
	if (persistTimer) clearTimeout(persistTimer);
	persistTimer = setTimeout(() => {
		const next = pendingPersist;
		pendingPersist = null;
		persistTimer = undefined;
		if (next !== null) void writeLinkedPsvFile(next);
	}, PERSIST_DELAY_MS);
}

export function setRawEntries(rawEntries: string): void {
	rawEntriesStore.set(rawEntries);
	void persistRawEntries(rawEntries);
}

/** Switch sets without writing the linked file (avoids overwriting a disk file on browse). */
export function activateEntrySet(rawEntries: string): void {
	rawEntriesStore.set(rawEntries);
	localStorage.setItem('rawEntries', rawEntries);
	localStorage.setItem(USER_ENTRIES_KEY, rawEntries);
}

export async function initializeData(): Promise<void> {
	const lsSettings = localStorage.getItem('settings');
	const parsedSettings = lsSettings ? JSON.parse(lsSettings) : {};
	const settings = { ...defaultSettings, ...parsedSettings };
	delete (settings as { useDemoEntries?: boolean }).useDemoEntries;
	settingsStore.set(settings);
	localStorage.setItem('settings', JSON.stringify(settings));

	const linked = await restoreLinkedFile();
	const storedSets = loadEntrySets();
	const legacyRaw =
		linked?.content ??
		localStorage.getItem(USER_ENTRIES_KEY) ??
		localStorage.getItem('rawEntries');

	const setsState = storedSets ?? migrateLegacyEntries(legacyRaw);
	entrySetsStore.set(setsState);
	persistEntrySets(setsState);

	if (storedSets && linked?.content) {
		updateActiveRaw(linked.content);
	}

	const active = getActiveSet(get(entrySetsStore));
	rawEntriesStore.set(active.raw);
	localStorage.setItem('rawEntries', active.raw);
	localStorage.setItem(USER_ENTRIES_KEY, active.raw);
}

export function getRawEntries(): string {
	return get(rawEntriesStore);
}

export function getUserEntries(): string | null {
	return localStorage.getItem(USER_ENTRIES_KEY);
}

export function resetAllData(): void {
	localStorage.removeItem('settings');
	localStorage.removeItem('rawEntries');
	localStorage.removeItem(USER_ENTRIES_KEY);
	localStorage.removeItem('forebalance_entrySets');
	const sets = resetToStarterSets();
	const settings = { ...defaultSettings };
	settingsStore.set(settings);
	rawEntriesStore.set(getActiveSet(sets).raw);
	localStorage.setItem('settings', JSON.stringify(settings));
	localStorage.setItem('rawEntries', getActiveSet(sets).raw);
	localStorage.setItem(USER_ENTRIES_KEY, getActiveSet(sets).raw);
}
