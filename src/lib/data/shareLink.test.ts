import { afterEach, expect, it, vi } from 'vitest';
import { shareUrl, takeSharePayload } from './shareLink';
import { tabIdFromHash } from '../nav/hashes';

afterEach(() => vi.unstubAllGlobals());

it('round trips entries exclusively through the fragment and preserves router state', () => {
  vi.stubGlobal('location', new URL('https://forebalance.app/?other=1#forecast'));
  const raw = 'B|2026-10-01|42|Private & + # €\nD|2026-10-02|2|Bill';
  const url = new URL(shareUrl(raw));
  expect(url.search).toBe('?other=1');
  expect(tabIdFromHash(url.hash)).toBe('entries');
  vi.stubGlobal('location', url);
  const replaceState = vi.fn();
  vi.stubGlobal('history', { state: { router: 1 }, replaceState });
  expect(takeSharePayload()).toBe(raw);
  expect(replaceState).toHaveBeenCalledWith({ router: 1 }, '', '/?other=1#entries');
});

it('consumes legacy links without generating more query links', () => {
  vi.stubGlobal('location', new URL('https://forebalance.app/?share=legacy#entries'));
  vi.stubGlobal('history', { state: null, replaceState: vi.fn() });
  expect(takeSharePayload()).toBe('legacy');
  expect(new URL(shareUrl('new')).search).toBe('');
});
