import { writable } from 'svelte/store';
import { clearPsvHandle, loadPsvHandle, storePsvHandle, type LinkedFile } from './fileHandleStore';

export const PSV_FILE_ACCEPT: FilePickerAcceptType['accept'] = { 'text/plain': ['.psv', '.txt'] };
export const fileStatus = writable('');
export const linkedFile = writable<{ name: string; scenarioId: string } | null>(null);
let active: LinkedFile | null = null;
let pending: LinkedFile | null = null;
let generation = 0;
let writes: Promise<boolean> = Promise.resolve(true);
let metadata: Promise<void> = Promise.resolve();
function persistLink(task: () => Promise<void>): Promise<void> {
  const result = metadata.then(task);
  metadata = result.catch(() => {});
  return result;
}

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showOpenFilePicker' in window;
}
export function getLinkedFileName(scenarioId: string): string | null {
  return active?.scenarioId === scenarioId ? active.handle.name : null;
}
export function linkedFileGeneration(): number {
  return generation;
}

/** Restore ownership only. Never replace browser entries with disk contents at startup. */
export async function restoreLinkedFile(): Promise<void> {
  if (!isFileSystemAccessSupported()) return;
  const ticket = generation;
  try {
    const saved = await loadPsvHandle();
    if (ticket !== generation || !saved) return;
    active = saved;
    linkedFile.set({ name: saved.handle.name, scenarioId: saved.scenarioId });
    fileStatus.set('Linked file restored. Browser entries are unchanged.');
  } catch {
    fileStatus.set('Linked file unavailable. Browser entries are still available.');
  }
}

/** Selection is provisional until the import confirmation has completed. */
export async function linkPsvFile(scenarioId: string): Promise<{ content: string; name: string } | null> {
  if (!isFileSystemAccessSupported()) return null;
  try {
    const [handle] = await window.showOpenFilePicker({ types: [{ description: 'ForeBalance PSV', accept: PSV_FILE_ACCEPT }], multiple: false });
    const content = await (await handle.getFile()).text();
    pending = { handle, scenarioId };
    return { content, name: handle.name };
  } catch (error) {
    if (!(error instanceof DOMException && error.name === 'AbortError')) fileStatus.set('The selected file could not be opened.');
    return null;
  }
}
export function cancelPendingLink(): void {
  pending = null;
}
export async function confirmPendingLink(scenarioId: string): Promise<boolean> {
  if (!pending || pending.scenarioId !== scenarioId) {
    pending = null;
    return false;
  }
  const next = pending;
  pending = null;
  const ticket = generation;
  try {
    if ((await next.handle.requestPermission({ mode: 'readwrite' })) !== 'granted') {
      fileStatus.set('Write permission was not granted. The scenario and existing link are unchanged.');
      return false;
    }
  } catch {
    fileStatus.set('File permission could not be requested. Try linking again.');
    return false;
  }
  if (ticket !== generation) return false;
  ++generation;
  active = next;
  linkedFile.set({ name: next.handle.name, scenarioId });
  fileStatus.set('File linked to this scenario.');
  try {
    await persistLink(() => storePsvHandle(next));
  } catch {
    fileStatus.set('File linked for this tab only; relink it after reopening the app.');
  }
  return true;
}

export function writeLinkedPsvFile(content: string, scenarioId: string, ticket = generation): Promise<boolean> {
  const target = active;
  if (!target || target.scenarioId !== scenarioId || ticket !== generation) return Promise.resolve(false);
  writes = writes.then(async () => {
    if (active !== target || ticket !== generation) return false;
    try {
      if ((await target.handle.queryPermission({ mode: 'readwrite' })) !== 'granted') {
        fileStatus.set('File permission is needed. Relink the file to resume disk saves.');
        return false;
      }
      if (active !== target || ticket !== generation) return false;
      fileStatus.set('Saving linked file…');
      const writer = await target.handle.createWritable();
      try {
        if (active !== target || ticket !== generation) {
          await writer.abort();
          return false;
        }
        await writer.write(content);
        await writer.close();
      } catch (error) {
        await writer.abort().catch(() => {});
        throw error;
      }
      fileStatus.set('Linked file saved.');
      return true;
    } catch {
      fileStatus.set('Linked file could not be saved. Export a copy of your changes.');
      return false;
    }
  });
  return writes;
}

export async function unlinkPsvFile(): Promise<void> {
  ++generation;
  active = null;
  pending = null;
  linkedFile.set(null);
  const cleared = persistLink(clearPsvHandle);
  // Observe failures immediately even if a disk write is still completing.
  const clearResult = cleared.then(
    () => true,
    () => false,
  );
  await writes;
  if (await clearResult) {
    fileStatus.set('File unlinked.');
  } else {
    fileStatus.set('File unlinked for this tab, but the saved link could not be removed.');
  }
}
export function readImportFile(file: File): Promise<string> {
  return file.text();
}
export function isForebalancePsvName(name: string): boolean {
  return /\.psv$/i.test(name) || /^(myBalanceForcaster|forebalance)/i.test(name);
}
