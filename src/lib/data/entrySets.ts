import { get, writable } from 'svelte/store';
import { pruneEntryHistory } from '$lib/data/entryHistory';
import { ensureCurrencyHeader, extractCurrency } from '$lib/data/currencyHeader';
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
	description?: string;
	parentId?: string | null;
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
		return refreshKnownStarterSeeds(parsed);
	} catch {
		return null;
	}
}

/** The first Variable pay seed only paid three gig weeks once, then a lean weekly average. */
export function isBrokenVariablePaySeed(raw: string): boolean {
	return raw.includes('|640|Balance Checking 2201');
}

/** Replace known-bad starter text; leave user-edited copies alone. */
export function refreshKnownStarterSeeds(state: EntrySetsState): EntrySetsState {
	let changed = false;
	const sets = state.sets.map((set) => {
		if (!isBrokenVariablePaySeed(set.raw)) return set;
		changed = true;
		return { ...set, raw: getTemplate('variable-pay').build() };
	});
	return changed ? { ...state, sets } : state;
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

/** An unused starter still has the template name. A rename means the set is theirs. */
export function unusedStarterForTemplate(
	sets: EntrySet[],
	templateId: string,
): EntrySet | undefined {
	const template = getTemplate(templateId);
	return sets.find((set) => set.templateId === templateId && set.name === template.name);
}

export function resolveStarterClick(
	sets: EntrySet[],
	templateId: string,
): { action: 'switch'; id: string } | { action: 'add' } {
	const unused = unusedStarterForTemplate(sets, templateId);
	return unused ? { action: 'switch', id: unused.id } : { action: 'add' };
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

export function forkEntrySet(id: string, name: string, description = ''): EntrySet {
	const state = get(entrySetsStore);
	const source = state.sets.find((set) => set.id === id) ?? getActiveSet(state);
	const fork: EntrySet = {
		id: newSetId(),
		name: uniqueSetName(name, state.sets),
		description: description.trim(),
		parentId: source.id,
		raw: source.raw,
	};
	const next: EntrySetsState = {
		activeId: fork.id,
		sets: [...state.sets, fork],
	};
	entrySetsStore.set(next);
	persistEntrySets(next);
	return fork;
}

export function cloneEntrySet(id: string): EntrySet {
	const state = get(entrySetsStore);
	const source = state.sets.find((set) => set.id === id) ?? getActiveSet(state);
	return forkEntrySet(id, source.name);
}

export function deleteEntrySet(id: string): EntrySetsState {
	const state = get(entrySetsStore);
	if (state.sets.length <= 1) return state;

	const sets = state.sets.filter((set) => set.id !== id);
	const activeId = state.activeId === id ? sets[0].id : state.activeId;
	const next: EntrySetsState = { activeId, sets };
	entrySetsStore.set(next);
	persistEntrySets(next);
	pruneEntryHistory(id);
	return next;
}

export function addNamedSet(name: string, raw: string, templateId?: string): EntrySet {
	const state = get(entrySetsStore);
	const set: EntrySet = {
		id: newSetId(),
		name: uniqueSetName(name, state.sets),
		raw,
		templateId,
	};
	const next: EntrySetsState = {
		activeId: set.id,
		sets: [...state.sets, set],
	};
	entrySetsStore.set(next);
	persistEntrySets(next);
	return set;
}

export function addSetFromTemplate(templateId: string): EntrySet {
	const template = getTemplate(templateId);
	return addNamedSet(template.name, template.build(), template.id);
}

export function resetToStarterSets(): EntrySetsState {
	const next = emptyStarterState();
	entrySetsStore.set(next);
	persistEntrySets(next);
	return next;
}

export function downloadTextFile(filename: string, content: string, mime = 'text/plain'): void {
	const element = document.createElement('a');
	element.setAttribute('href', `data:${mime};charset=utf-8,` + encodeURIComponent(content));
	element.setAttribute('download', filename);
	element.style.display = 'none';
	document.body.appendChild(element);
	element.click();
	document.body.removeChild(element);
}

export function allSetsBackupPayload(
	state: EntrySetsState,
	currencyIsoCode: string,
	locale: string,
	exportedAt = new Date(),
	categories?: { id: string; name: string; color?: string; order: number }[],
): {
	app: 'forebalance';
	version: 2;
	currencyIsoCode: string;
	locale: string;
	exportedAt: string;
	sets: { name: string; raw: string; description?: string; parentId?: string }[];
	categories?: { id: string; name: string; color?: string; order: number }[];
} {
	return {
		app: 'forebalance',
		version: 2,
		currencyIsoCode,
		locale,
		exportedAt: exportedAt.toISOString(),
		sets: state.sets.map((set) => ({
			name: set.name,
			raw: ensureCurrencyHeader(set.raw, extractCurrency(set.raw) ?? currencyIsoCode),
			...(set.description ? { description: set.description } : {}),
			...(set.parentId ? { parentId: set.parentId } : {}),
		})),
		...(categories ? { categories } : {}),
	};
}

/** One JSON backup of every set. */
export function exportAllSetsBackup(
	currentRaw?: string,
	currencyIsoCode = 'USD',
	locale = 'en-US',
	categories?: { id: string; name: string; color?: string; order: number }[],
): void {
	if (currentRaw !== undefined) {
		updateActiveRaw(currentRaw);
	}
	const state = get(entrySetsStore);
	const day = new Date().toISOString().slice(0, 10);
	downloadTextFile(
		`forebalance-all-sets-${day}.json`,
		JSON.stringify(allSetsBackupPayload(state, currencyIsoCode, locale, new Date(), categories), null, 2),
		'application/json',
	);
}

export { buildDefaultEntries };
