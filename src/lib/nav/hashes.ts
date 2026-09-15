export const TAB_IDS = ['welcome', 'entries', 'forecast', 'settings', 'labs', 'help'] as const;
export const DOC_IDS = ['about', 'privacy'] as const;

export type TabId = (typeof TAB_IDS)[number];
export type DocId = (typeof DOC_IDS)[number];

export function idFromHash(hash = ''): string {
	return hash.replace(/^#/, '').toLowerCase();
}

export function tabIdFromHash(
	hash = typeof location !== 'undefined' ? location.hash : '',
): TabId | null {
	const id = idFromHash(hash);
	if ((TAB_IDS as readonly string[]).includes(id)) return id as TabId;
	if ((DOC_IDS as readonly string[]).includes(id)) return null;
	if (id) return 'help';
	return 'welcome';
}

export function docIdFromHash(
	hash = typeof location !== 'undefined' ? location.hash : '',
): DocId | null {
	const id = idFromHash(hash);
	if ((DOC_IDS as readonly string[]).includes(id)) return id as DocId;
	return null;
}

export function tabHashFromId(id: TabId): string {
	return `#${id}`;
}
