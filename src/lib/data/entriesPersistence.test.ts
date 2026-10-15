import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
const file = vi.hoisted(() => ({ restoreLinkedFile: vi.fn(), writeLinkedPsvFile: vi.fn(), linkedFileGeneration: () => 4, unlinkPsvFile: vi.fn() }));
vi.mock('#lib/persistence/psvPersistence.ts', () => file);

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.useFakeTimers();
  const disk = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => disk.get(key) ?? null,
    setItem: (key: string, value: string) => disk.set(key, value),
    removeItem: (key: string) => disk.delete(key),
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function setup() {
  const sets = await import('./entrySets');
  const stores = await import('../stores/settings');
  const api = await import('./entriesPersistence');
  sets.entrySetsStore.set({
    activeId: 'a',
    sets: [
      { id: 'a', name: 'A', raw: 'old-a' },
      { id: 'b', name: 'B', raw: 'old-b' },
    ],
  });
  stores.rawEntriesStore.set('old-a');
  return { ...sets, ...stores, ...api };
}

it('flushes the outgoing save with its owner when switching scenarios', async () => {
  const api = await setup();
  api.setRawEntries('new-a');
  const next = api.switchEntrySet('b', 'new-a')!;
  api.activateEntrySet(next.raw);
  await vi.runAllTimersAsync();
  expect(file.writeLinkedPsvFile).toHaveBeenCalledExactlyOnceWith('new-a', 'a', 4);
  expect(get(api.rawEntriesStore)).toBe('old-b');
});

it('reset cancels delayed saves and detaches the file', async () => {
  const api = await setup();
  api.setRawEntries('new-a');
  api.resetAllData();
  await vi.runAllTimersAsync();
  expect(file.writeLinkedPsvFile).not.toHaveBeenCalled();
  expect(file.unlinkPsvFile).toHaveBeenCalledOnce();
});

it('a departing editor commits to its original scenario', async () => {
  const api = await setup();
  api.switchEntrySet('b');
  api.activateEntrySet('old-b');
  api.setScenarioRaw('last edit', 'a');
  expect(get(api.rawEntriesStore)).toBe('old-b');
  expect(get(api.entrySetsStore).sets[0].raw).toBe('last edit');
});

it('malformed scenarios are retained for recovery before defaults are written', async () => {
  const api = await setup();
  localStorage.setItem('forebalance_entrySets', '{broken');
  await api.initializeData();
  expect(localStorage.getItem('forebalance_entrySets.recovery')).toBe('{broken');
  expect(get(api.entrySetsStore).sets.length).toBeGreaterThan(0);
});
