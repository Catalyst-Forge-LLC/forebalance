/** Client-side scenario link. The text stays in the URL. Nothing is uploaded. */

export function shareUrl(raw: string): string {
  const url = new URL(location.href);
  url.searchParams.delete('share');
  url.hash = `entries?${new URLSearchParams({ share: raw })}`;
  return url.toString();
}

export function takeSharePayload(): string | null {
  const params = new URLSearchParams(location.search);
  const fragment = new URLSearchParams(location.hash.split('?')[1] ?? '');
  const share = fragment.get('share') ?? params.get('share');
  if (share === null || share === '') return null;
  params.delete('share');
  const query = params.toString();
  history.replaceState(history.state, '', `${location.pathname}${query ? `?${query}` : ''}#entries`);
  return share;
}
