import { get, writable } from 'svelte/store';

export const HISTORY_LIMIT = 20;
export const HISTORY_KEY = 'forebalance_entryHistory';

export interface EntryVersion {
	at: string;
	raw: string;
}

export type EntryHistoryState = Record<string, EntryVersion[]>;

export const entryHistoryStore = writable<EntryHistoryState>({});

function canUseStorage(): boolean {
	return typeof localStorage !== 'undefined';
}

function readDisk(): EntryHistoryState {
	if (!canUseStorage()) return {};
	try {
		const raw = localStorage.getItem(HISTORY_KEY);
		if (!raw) return {};
		const parsed = JSON.parse(raw) as EntryHistoryState;
		if (!parsed || typeof parsed !== 'object') return {};
		return parsed;
	} catch {
		return {};
	}
}

function persist(state: EntryHistoryState): void {
	entryHistoryStore.set(state);
	if (!canUseStorage()) return;
	try {
		localStorage.setItem(HISTORY_KEY, JSON.stringify(state));
	} catch {
		const trimmed = trimOldest(state);
		try {
			localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
			entryHistoryStore.set(trimmed);
		} catch {
			// Quota still exceeded — keep the in-memory copy.
		}
	}
}

function trimOldest(state: EntryHistoryState): EntryHistoryState {
	const next: EntryHistoryState = {};
	for (const [id, versions] of Object.entries(state)) {
		next[id] = versions.slice(0, Math.max(1, versions.length - 1));
	}
	return next;
}

export function loadEntryHistory(): EntryHistoryState {
	const state = readDisk();
	entryHistoryStore.set(state);
	return state;
}

export function listEntryVersions(
	setId: string,
	state: EntryHistoryState = get(entryHistoryStore),
): EntryVersion[] {
	return state[setId] ?? [];
}

/** Store the outgoing text so the current edit can be undone later. */
export function recordEntryVersion(setId: string, previousRaw: string): void {
	if (!setId || previousRaw === undefined) return;
	const state = get(entryHistoryStore);
	const existing = state[setId] ?? [];
	if (existing[0]?.raw === previousRaw) return;
	const next: EntryHistoryState = {
		...state,
		[setId]: [{ at: new Date().toISOString(), raw: previousRaw }, ...existing].slice(
			0,
			HISTORY_LIMIT,
		),
	};
	persist(next);
}

export function pruneEntryHistory(setId: string): void {
	const state = get(entryHistoryStore);
	if (!(setId in state)) return;
	const next = { ...state };
	delete next[setId];
	persist(next);
}

export function clearEntryHistory(): void {
	persist({});
	if (canUseStorage()) localStorage.removeItem(HISTORY_KEY);
}

export function formatHistoryLabel(iso: string, now = new Date()): string {
	const date = new Date(iso);
	if (Number.isNaN(date.valueOf())) return 'Earlier version';
	const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
	const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).valueOf();
	const startThat = new Date(date.getFullYear(), date.getMonth(), date.getDate()).valueOf();
	const days = Math.round((startToday - startThat) / 86_400_000);
	if (days === 0) return `Today ${time}`;
	if (days === 1) return `Yesterday ${time}`;
	const day = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	return `${day} ${time}`;
}

export function historySnippet(raw: string, max = 36): string {
	const line =
		raw
			.split('\n')
			.map((part) => part.trim())
			.find((part) => part && !part.startsWith('---')) ?? '';
	if (line.length <= max) return line;
	return `${line.slice(0, max - 1)}…`;
}
