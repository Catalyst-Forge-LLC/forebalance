import { get } from 'svelte/store';
import { defaultEntries } from '$lib/data/defaultEntries';
import { defaultSettings } from '$lib/data/defaultSettings';
import { restoreLinkedFile, writeLinkedPsvFile } from '$lib/persistence/psvPersistence';
import { rawEntriesStore, settingsStore } from '$lib/stores/settings';

const USER_ENTRIES_KEY = 'userEntries';
const PERSIST_DELAY_MS = 800;

let persistTimer: ReturnType<typeof setTimeout> | undefined;
let pendingPersist: string | null = null;

function isDemoMode(): boolean {
	return get(settingsStore).useDemoEntries ?? false;
}

function writeLocalCopies(rawEntries: string): void {
	localStorage.setItem('rawEntries', rawEntries);
	if (!isDemoMode()) {
		localStorage.setItem(USER_ENTRIES_KEY, rawEntries);
	}
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

export function setEntriesSource(useDemo: boolean): void {
	const current = get(rawEntriesStore);

	if (useDemo) {
		if (!isDemoMode()) {
			localStorage.setItem(USER_ENTRIES_KEY, current);
		}
		rawEntriesStore.set(defaultEntries);
		localStorage.setItem('rawEntries', defaultEntries);
	} else {
		const userEntries =
			localStorage.getItem(USER_ENTRIES_KEY) ??
			localStorage.getItem('rawEntries') ??
			defaultEntries;
		rawEntriesStore.set(userEntries);
		localStorage.setItem('rawEntries', userEntries);
	}

	settingsStore.update((settings) => {
		const next = { ...settings, useDemoEntries: useDemo };
		localStorage.setItem('settings', JSON.stringify(next));
		return next;
	});
}

export async function initializeData(): Promise<void> {
	const lsSettings = localStorage.getItem('settings');
	const settings = lsSettings
		? { ...defaultSettings, ...JSON.parse(lsSettings) }
		: { ...defaultSettings };
	settingsStore.set(settings);

	const linked = await restoreLinkedFile();
	if (linked) {
		rawEntriesStore.set(linked.content);
		localStorage.setItem('rawEntries', linked.content);
		if (!settings.useDemoEntries) {
			localStorage.setItem(USER_ENTRIES_KEY, linked.content);
		}
		return;
	}

	const storedUser =
		localStorage.getItem(USER_ENTRIES_KEY) ?? localStorage.getItem('rawEntries');
	if (storedUser && !localStorage.getItem(USER_ENTRIES_KEY)) {
		localStorage.setItem(USER_ENTRIES_KEY, storedUser);
	}

	if (settings.useDemoEntries) {
		rawEntriesStore.set(defaultEntries);
		localStorage.setItem('rawEntries', defaultEntries);
	} else {
		rawEntriesStore.set(storedUser ?? defaultEntries);
	}
}

export function getRawEntries(): string {
	return get(rawEntriesStore);
}

export function getUserEntries(): string | null {
	return localStorage.getItem(USER_ENTRIES_KEY);
}
