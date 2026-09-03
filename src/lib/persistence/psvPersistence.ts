import { clearPsvHandle, loadPsvHandle, storePsvHandle } from './fileHandleStore';

export const PSV_FILE_ACCEPT = {
	'text/plain': ['.psv', '.txt'],
};

export function isFileSystemAccessSupported(): boolean {
	return typeof window !== 'undefined' && 'showOpenFilePicker' in window;
}

let activeHandle: FileSystemFileHandle | null = null;

export function getLinkedFileName(): string | null {
	return activeHandle?.name ?? null;
}

export async function restoreLinkedFile(): Promise<{ content: string; name: string } | null> {
	if (!isFileSystemAccessSupported()) return null;

	const handle = await loadPsvHandle();
	if (!handle) return null;

	const permission = await handle.queryPermission({ mode: 'readwrite' });
	if (permission !== 'granted') {
		const requested = await handle.requestPermission({ mode: 'readwrite' });
		if (requested !== 'granted') return null;
	}

	activeHandle = handle;
	const file = await handle.getFile();
	return { content: await file.text(), name: handle.name };
}

export async function linkPsvFile(): Promise<{ content: string; name: string } | null> {
	if (!isFileSystemAccessSupported()) return null;

	const [handle] = await window.showOpenFilePicker({
		types: [{ description: 'ForeBalance PSV', accept: PSV_FILE_ACCEPT }],
		multiple: false,
	});

	activeHandle = handle;
	await storePsvHandle(handle);

	const file = await handle.getFile();
	return { content: await file.text(), name: handle.name };
}

export async function writeLinkedPsvFile(content: string): Promise<boolean> {
	if (!activeHandle) return false;

	try {
		const permission = await activeHandle.queryPermission({ mode: 'readwrite' });
		if (permission !== 'granted') {
			const requested = await activeHandle.requestPermission({ mode: 'readwrite' });
			if (requested !== 'granted') return false;
		}

		const writable = await activeHandle.createWritable();
		await writable.write(content);
		await writable.close();
		localStorage.setItem('forebalance_lastSaved', new Date().toISOString());
		return true;
	} catch {
		return false;
	}
}

export async function unlinkPsvFile(): Promise<void> {
	activeHandle = null;
	await clearPsvHandle();
}

export function readImportFile(file: File): Promise<string> {
	return file.text();
}

export function isForebalancePsvName(name: string): boolean {
	return /\.psv$/i.test(name) || /^(myBalanceForcaster|forebalance)/i.test(name);
}
