const DB_NAME = 'forebalance';
const STORE = 'handles';
const PSV_HANDLE_KEY = 'psv';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export interface LinkedFile {
  handle: FileSystemFileHandle;
  scenarioId: string;
}

export async function storePsvHandle(handle: LinkedFile): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(handle, PSV_HANDLE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadPsvHandle(): Promise<LinkedFile | null> {
  const db = await openDb();
  const handle = await new Promise<LinkedFile | null>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(PSV_HANDLE_KEY);
    req.onsuccess = () => {
      const value = req.result;
      resolve(value?.scenarioId && value?.handle ? value : null);
    };
    req.onerror = () => reject(req.error);
  });
  db.close();
  return handle;
}

export async function clearPsvHandle(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(PSV_HANDLE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
