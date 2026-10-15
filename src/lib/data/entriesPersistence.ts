import { storage, readJson } from '$lib/persistence/storage';
import { readSettings } from './readSettings';
import { get } from 'svelte/store';
import { defaultSettings } from '$lib/data/defaultSettings';
import { entrySetsStore, getActiveSet, loadEntrySets, migrateLegacyEntries, persistEntrySets, resetToStarterSets, updateActiveRaw } from '$lib/data/entrySets';
import { clearEntryHistory, loadEntryHistory, recordEntryVersion } from '$lib/data/entryHistory';
import { restoreLinkedFile, writeLinkedPsvFile, linkedFileGeneration, unlinkPsvFile } from '$lib/persistence/psvPersistence';
import { extractCurrency } from '$lib/data/currencyHeader';
import { applyDisplayCurrency, persistSettings, rawEntriesStore } from '$lib/stores/settings';

const USER_ENTRIES_KEY = 'userEntries';
const PERSIST_DELAY_MS = 800;

let persistTimer: ReturnType<typeof setTimeout> | undefined;
let pendingPersist: { raw: string; scenarioId: string; generation: number } | null = null;

function cancelPendingPersist(): void {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = undefined;
  pendingPersist = null;
}

function writeLocalCopies(rawEntries: string): void {
  storage.setItem('rawEntries', rawEntries);
  storage.setItem(USER_ENTRIES_KEY, rawEntries);
  updateActiveRaw(rawEntries);
}

export async function persistRawEntries(rawEntries: string): Promise<void> {
  writeLocalCopies(rawEntries);
  pendingPersist = { raw: rawEntries, scenarioId: get(entrySetsStore).activeId, generation: linkedFileGeneration() };
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    const next = pendingPersist;
    pendingPersist = null;
    persistTimer = undefined;
    if (next !== null) void writeLinkedPsvFile(next.raw, next.scenarioId, next.generation);
  }, PERSIST_DELAY_MS);
}

export function setRawEntries(rawEntries: string): void {
  const previous = get(rawEntriesStore);
  if (previous === rawEntries) return;
  const setId = get(entrySetsStore).activeId;
  if (previous !== rawEntries) {
    recordEntryVersion(setId, previous);
  }
  rawEntriesStore.set(rawEntries);
  void persistRawEntries(rawEntries);
}

function syncCurrencyFromRaw(rawEntries: string): void {
  const marked = extractCurrency(rawEntries);
  if (marked) applyDisplayCurrency(marked);
}

/** Finish the outgoing save using its owner; browsing never writes the incoming scenario to disk. */
export function activateEntrySet(rawEntries: string): void {
  const pending = pendingPersist;
  cancelPendingPersist();
  if (pending) void writeLinkedPsvFile(pending.raw, pending.scenarioId, pending.generation);
  rawEntriesStore.set(rawEntries);
  storage.setItem('rawEntries', rawEntries);
  storage.setItem(USER_ENTRIES_KEY, rawEntries);
  syncCurrencyFromRaw(rawEntries);
}

/** A departing editor commits to its original scenario, never the newly selected one. */
export function setScenarioRaw(raw: string, scenarioId: string): void {
  const state = get(entrySetsStore);
  if (state.activeId === scenarioId) {
    setRawEntries(raw);
    return;
  }
  const owner = state.sets.find((set) => set.id === scenarioId);
  if (!owner || owner.raw === raw) return;
  recordEntryVersion(scenarioId, owner.raw);
  const next = { ...state, sets: state.sets.map((set) => (set.id === scenarioId ? { ...set, raw } : set)) };
  entrySetsStore.set(next);
  persistEntrySets(next);
  void writeLinkedPsvFile(raw, scenarioId);
}

export async function initializeData(): Promise<void> {
  const settings = readSettings(readJson('settings'));
  persistSettings(settings);

  const storedSets = loadEntrySets();
  const legacyRaw = storage.getItem(USER_ENTRIES_KEY) ?? storage.getItem('rawEntries');

  const setsState = storedSets ?? migrateLegacyEntries(legacyRaw);
  entrySetsStore.set(setsState);
  persistEntrySets(setsState);
  loadEntryHistory();

  const active = getActiveSet(get(entrySetsStore));
  rawEntriesStore.set(active.raw);
  storage.setItem('rawEntries', active.raw);
  storage.setItem(USER_ENTRIES_KEY, active.raw);
  syncCurrencyFromRaw(active.raw);
  void restoreLinkedFile();
}

export function getRawEntries(): string {
  return get(rawEntriesStore);
}

export function getUserEntries(): string | null {
  return storage.getItem(USER_ENTRIES_KEY);
}

export function resetAllData(): void {
  cancelPendingPersist();
  void unlinkPsvFile();
  storage.removeItem('settings');
  storage.removeItem('rawEntries');
  storage.removeItem(USER_ENTRIES_KEY);
  storage.removeItem('forebalance_entrySets');
  clearEntryHistory();
  const sets = resetToStarterSets();
  persistSettings({ ...defaultSettings });
  rawEntriesStore.set(getActiveSet(sets).raw);
  storage.setItem('rawEntries', getActiveSet(sets).raw);
  storage.setItem(USER_ENTRIES_KEY, getActiveSet(sets).raw);
}
