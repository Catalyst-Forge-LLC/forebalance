import { afterEach, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
afterEach(() => vi.unstubAllGlobals());
it('keeps unsaved edits readable and exposes a storage failure', async () => {
  vi.resetModules();
  vi.stubGlobal('localStorage', {
    setItem() {
      throw new Error('quota');
    },
    getItem() {
      return 'old';
    },
  });
  const { storage, storageError } = await import('./storage');
  storage.setItem('scenario', 'new');
  expect(storage.getItem('scenario')).toBe('new');
  expect(get(storageError)).toContain('only in memory');
});
