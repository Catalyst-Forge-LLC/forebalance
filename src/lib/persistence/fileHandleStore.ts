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

export async function storePsvHandle(handle: FileSystemFileHandle): Promise<void> {
	const db = await openDb();
	await new Promise<void>((resolve, reject) => {
		const tx = db.transaction(STORE, 'readwrite');
		tx.objectStore(STORE).put(handle, PSV_HANDLE_KEY);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
	db.close();
}

export async function loadPsvHandle(): Promise<FileSystemFileHandle | null> {
	const db = await openDb();
	const handle = await new Promise<FileSystemFileHandle | null>((resolve, reject) => {
		const tx = db.transaction(STORE, 'readonly');
		const req = tx.objectStore(STORE).get(PSV_HANDLE_KEY);
		req.onsuccess = () => resolve((req.result as FileSystemFileHandle) ?? null);
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
