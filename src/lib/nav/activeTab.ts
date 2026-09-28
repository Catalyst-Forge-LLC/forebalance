import { writable } from 'svelte/store';
import type { TabId } from './hashes';

/** Section currently shown. Stays null until the client has read the hash. */
export const activeTabId = writable<TabId | null>(null);
