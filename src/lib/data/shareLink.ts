/** Client-side scenario link. The text stays in the URL. Nothing is uploaded. */

export function shareUrl(raw: string): string {
	const url = new URL(location.href);
	url.searchParams.set('share', raw);
	url.hash = 'entries';
	return url.toString();
}

export function takeSharePayload(): string | null {
	const params = new URLSearchParams(location.search);
	const share = params.get('share');
	if (share === null || share === '') return null;
	params.delete('share');
	const query = params.toString();
	history.replaceState(null, '', `${location.pathname}${query ? `?${query}` : ''}${location.hash}`);
	return share;
}
