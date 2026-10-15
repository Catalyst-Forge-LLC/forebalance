import { writable } from 'svelte/store';

/** Keep editing available when storage is blocked or full. Never claim a failed write saved. */
export const storageError = writable('');
const memory = new Map<string, string | null>();
export function canUseBrowserStorage(): boolean {
  try {
    return typeof localStorage !== 'undefined';
  } catch {
    storageError.set('Browser storage is unavailable. Export your scenarios before closing this tab.');
    return false;
  }
}
export const storage = {
  getItem(key: string): string | null {
    if (memory.has(key)) return memory.get(key) ?? null;
    try {
      return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
    } catch {
      storageError.set('Browser storage is unavailable. Export your scenarios before closing this tab.');
      return null;
    }
  },
  setItem(key: string, value: string): void {
    memory.set(key, value);
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(key, value);
      memory.delete(key);
    } catch {
      storageError.set('Changes are only in memory because browser storage could not save them. Export your scenarios before closing this tab.');
    }
  },
  removeItem(key: string): void {
    memory.set(key, null);
    try {
      localStorage.removeItem(key);
      memory.delete(key);
    } catch {
      storageError.set('Browser storage could not be cleared. Previously saved data may return after reload.');
    }
  },
};

export function readJson(key: string): unknown {
  const raw = storage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    storage.setItem(`${key}.recovery`, raw);
    storageError.set('Some saved data could not be read. Its original text was retained for recovery.');
    return null;
  }
}
