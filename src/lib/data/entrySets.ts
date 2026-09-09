import { get, writable } from 'svelte/store';
import { getRandomId } from '$lib/parser/recurrence';
import {
	buildDefaultEntries,
	entryTemplates,
	getTemplate,
	type EntryTemplate,
} from './entryTemplates';

export interface EntrySet {
	id: string;
	name: string;
	raw: string;
	templateId?: string;
}

export interface EntrySetsState {
	activeId: string;
	sets: EntrySet[];
}

const STORAGE_KEY = 'forebalance_entrySets';

export const entrySetsStore = writable<EntrySetsState>(emptyStarterState());

export function emptyStarterState(): EntrySetsState {
	const sets = starterSets();
	return { activeId: sets[0].id, sets };
}

export function starterSets(): EntrySet[] {
	return entryTemplates.map((template) => ({
		id: newSetId(),
		name: template.name,
		raw: template.build(),
		templateId: template.id,
	}));
}

export function newSetId(): string {
	return `set_${getRandomId()}`;
}

export function uniqueSetName(base: string, sets: EntrySet[], ignoreId?: string): string {
	const taken = (name: string) =>
		sets.some((set) => set.id !== ignoreId && set.name === name);
	const trimmed = base.trim() || 'Untitled';
	if (!taken(trimmed)) return trimmed;
	let n = 2;
	while (taken(`${trimmed} ${n}`)) n += 1;
	return `${trimmed} ${n}`;
}

export function getActiveSet(state: EntrySetsState = get(entrySetsStore)): EntrySet {
	return state.sets.find((set) => set.id === state.activeId) ?? state.sets[0];
}

export function persistEntrySets(state: EntrySetsState): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadEntrySets(): EntrySetsState | null {
	if (typeof localStorage === 'undefined') return null;
	const raw = localStorage.getItem(STORAGE_KEY);
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw) as EntrySetsState;
		if (!parsed?.sets?.length || !parsed.activeId) return null;
		if (!parsed.sets.some((set) => set.id === parsed.activeId)) {
			parsed.activeId = parsed.sets[0].id;
		}
		return parsed;
	} catch {
		return null;
	}
}

/** Existing single-file users become one editable set named My entries. */
export function migrateLegacyEntries(legacyRaw: string | null): EntrySetsState {
	if (legacyRaw && legacyRaw.trim()) {
		const set: EntrySet = {
			id: newSetId(),
			name: 'My entries',
			raw: legacyRaw,
		};
		return { activeId: set.id, sets: [set] };
	}
	return emptyStarterState();
}

export function listTemplates(): EntryTemplate[] {
	return entryTemplates;
}

export function updateActiveRaw(raw: string, state = get(entrySetsStore)): EntrySetsState {
	const next: EntrySetsState = {
		...state,
		sets: state.sets.map((set) => (set.id === state.activeId ? { ...set, raw } : set)),
	};
	entrySetsStore.set(next);
	persistEntrySets(next);
	return next;
}

export function switchEntrySet(id: string, currentRaw?: string): EntrySet | null {
	const state = get(entrySetsStore);
	const target = state.sets.find((set) => set.id === id);
	if (!target) return null;

	let sets = state.sets;
	if (currentRaw !== undefined) {
		sets = sets.map((set) => (set.id === state.activeId ? { ...set, raw: currentRaw } : set));
	}

	const next: EntrySetsState = { activeId: id, sets };
	entrySetsStore.set(next);
	persistEntrySets(next);
	return next.sets.find((set) => set.id === id) ?? target;
}

export function renameEntrySet(id: string, name: string): EntrySetsState {
	const state = get(entrySetsStore);
	const nextName = uniqueSetName(name, state.sets, id);
	const next: EntrySetsState = {
		...state,
		sets: state.sets.map((set) => (set.id === id ? { ...set, name: nextName } : set)),
	};
	entrySetsStore.set(next);
	persistEntrySets(next);
	return next;
}

export function cloneEntrySet(id: string): EntrySet {
	const state = get(entrySetsStore);
	const source = state.sets.find((set) => set.id === id) ?? getActiveSet(state);
	const clone: EntrySet = {
		id: newSetId(),
		name: uniqueSetName(source.name, state.sets),
		raw: source.raw,
		templateId: source.templateId,
	};
	const next: EntrySetsState = {
		activeId: clone.id,
		sets: [...state.sets, clone],
	};
	entrySetsStore.set(next);
	persistEntrySets(next);
	return clone;
}

export function deleteEntrySet(id: string): EntrySetsState {
	const state = get(entrySetsStore);
	if (state.sets.length <= 1) return state;

	const sets = state.sets.filter((set) => set.id !== id);
	const activeId = state.activeId === id ? sets[0].id : state.activeId;
	const next: EntrySetsState = { activeId, sets };
	entrySetsStore.set(next);
	persistEntrySets(next);
	return next;
}

export function addSetFromTemplate(templateId: string): EntrySet {
	const state = get(entrySetsStore);
	const template = getTemplate(templateId);
	const set: EntrySet = {
		id: newSetId(),
		name: uniqueSetName(template.name, state.sets),
		raw: template.build(),
		templateId: template.id,
	};
	const next: EntrySetsState = {
		activeId: set.id,
		sets: [...state.sets, set],
	};
	entrySetsStore.set(next);
	persistEntrySets(next);
	return set;
}

export function resetToStarterSets(): EntrySetsState {
	const next = emptyStarterState();
	entrySetsStore.set(next);
	persistEntrySets(next);
	return next;
}

export { buildDefaultEntries };
