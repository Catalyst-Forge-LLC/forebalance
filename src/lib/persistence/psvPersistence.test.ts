import { beforeEach, afterEach, expect, it, vi } from 'vitest';
const disk = vi.hoisted(() => ({ storePsvHandle: vi.fn(), loadPsvHandle: vi.fn(), clearPsvHandle: vi.fn() }));
vi.mock('./fileHandleStore', () => disk);

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});
afterEach(() => vi.unstubAllGlobals());

function file() {
  const writer = { write: vi.fn(), close: vi.fn(), abort: vi.fn() };
  const handle = {
    name: 'test.psv',
    getFile: vi.fn().mockResolvedValue({ text: async () => 'original' }),
    requestPermission: vi.fn().mockResolvedValue('granted'),
    queryPermission: vi.fn().mockResolvedValue('granted'),
    createWritable: vi.fn().mockResolvedValue(writer),
  };
  vi.stubGlobal('window', { showOpenFilePicker: vi.fn().mockResolvedValue([handle]) });
  return { handle, writer };
}

it('does not save to a selected file before confirmation or after cancel', async () => {
  const { handle } = file();
  const api = await import('./psvPersistence');
  await api.linkPsvFile('a');
  expect(await api.writeLinkedPsvFile('changed', 'a')).toBe(false);
  api.cancelPendingLink();
  expect(await api.confirmPendingLink('a')).toBe(false);
  expect(handle.createWritable).not.toHaveBeenCalled();
});

it('writes only the owning scenario and rejects stale saves after relinking', async () => {
  const { writer } = file();
  const api = await import('./psvPersistence');
  await api.linkPsvFile('a');
  await api.confirmPendingLink('a');
  const ticket = api.linkedFileGeneration();
  expect(await api.writeLinkedPsvFile('wrong', 'b')).toBe(false);
  expect(await api.writeLinkedPsvFile('right', 'a')).toBe(true);
  await api.unlinkPsvFile();
  await api.linkPsvFile('b');
  await api.confirmPendingLink('b');
  expect(await api.writeLinkedPsvFile('stale', 'b', ticket)).toBe(false);
  expect(writer.write).toHaveBeenCalledExactlyOnceWith('right');
});

it('serializes writes so an older save cannot finish after a newer save', async () => {
  const { writer } = file();
  const api = await import('./psvPersistence');
  await api.linkPsvFile('a');
  await api.confirmPendingLink('a');
  const events: string[] = [];
  writer.write.mockImplementation(async (value: string) => {
    events.push(value);
    await Promise.resolve();
  });
  writer.close.mockImplementation(async () => {
    events.push('close');
  });
  await Promise.all([api.writeLinkedPsvFile('one', 'a'), api.writeLinkedPsvFile('two', 'a')]);
  expect(events).toEqual(['one', 'close', 'two', 'close']);
});

it('restores ownership without reading or overwriting browser entries', async () => {
  const { handle } = file();
  disk.loadPsvHandle.mockResolvedValue({ handle, scenarioId: 'a' });
  const api = await import('./psvPersistence');
  await api.restoreLinkedFile();
  expect(api.getLinkedFileName('a')).toBe('test.psv');
  expect(api.getLinkedFileName('b')).toBeNull();
  expect(handle.getFile).not.toHaveBeenCalled();
});

it('survives inaccessible IndexedDB and denied file permissions', async () => {
  const { handle } = file();
  const api = await import('./psvPersistence');
  disk.loadPsvHandle.mockRejectedValue(new Error('denied'));
  await expect(api.restoreLinkedFile()).resolves.toBeUndefined();
  await api.linkPsvFile('a');
  await api.confirmPendingLink('a');
  handle.queryPermission.mockResolvedValue('denied');
  expect(await api.writeLinkedPsvFile('text', 'a')).toBe(false);
  expect(handle.createWritable).not.toHaveBeenCalled();
});

it('denied link confirmation leaves the existing file owner unchanged', async () => {
  const { handle } = file();
  const api = await import('./psvPersistence');
  await api.linkPsvFile('a');
  await api.confirmPendingLink('a');
  await api.linkPsvFile('b');
  handle.requestPermission.mockResolvedValue('denied');
  expect(await api.confirmPendingLink('b')).toBe(false);
  expect(api.getLinkedFileName('a')).toBe('test.psv');
  expect(api.getLinkedFileName('b')).toBeNull();
});

it('clears old link metadata before persisting a newly confirmed link', async () => {
  file();
  const api = await import('./psvPersistence');
  await api.linkPsvFile('a');
  await api.confirmPendingLink('a');
  const events: string[] = [];
  disk.clearPsvHandle.mockImplementation(async () => {
    await Promise.resolve();
    events.push('clear');
  });
  disk.storePsvHandle.mockImplementation(async () => {
    events.push('store');
  });
  const unlinked = api.unlinkPsvFile();
  await api.linkPsvFile('b');
  await api.confirmPendingLink('b');
  await unlinked;
  expect(events).toEqual(['clear', 'store']);
  expect(api.getLinkedFileName('b')).toBe('test.psv');
});
